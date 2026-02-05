// LEX-JUSTICIA: Ethical Market-Making on DeepBook
// Crisis Detection Oracle - Real-time market stress monitoring

module deepbookamm::crisis_oracle;

use sui::clock::{Self, Clock};

#[test_only]
use sui::tx_context;

/// Crisis detection result
public struct CrisisDetectionResult has copy, drop {
    is_crisis: bool,
    trigger_type: u8,  // 0: None, 1: Volatility, 2: Liquidity, 3: Spread
    volatility_bps: u64,
    liquidity_remaining_bps: u64,
    avg_spread_bps: u64,
    timestamp: u64,
}

/// Detect market crisis based on multiple signals
/// Returns CrisisDetectionResult with all metrics
public fun detect_crisis(
    previous_price: u64,
    current_price: u64,
    liquidity_before: u64,
    liquidity_current: u64,
    current_spread_bps: u64,
    clock: &Clock,
): CrisisDetectionResult {
    let volatility_bps = calculate_volatility(previous_price, current_price);
    
    // Calculate liquidity remaining percentage (in bps, 10000 = 100%)
    let liquidity_remaining_bps = if (liquidity_before > 0) {
        (liquidity_current * 10000) / liquidity_before
    } else {
        10000
    };
    
    let mut is_crisis = false;
    let mut trigger_type = 0u8;
    
    // Trigger 1: Volatility > 3000 bps (30%)
    if (volatility_bps > 3000) {
        is_crisis = true;
        trigger_type = 1;
    };
    
    // Trigger 2: Liquidity drain > 40% (remaining < 6000 bps)
    if (liquidity_remaining_bps < 6000) {
        is_crisis = true;
        if (trigger_type == 0) {
            trigger_type = 2;
        };
    };
    
    // Trigger 3: Spread widening > 1000 bps (10x normal)
    if (current_spread_bps > 1000) {
        is_crisis = true;
        if (trigger_type == 0) {
            trigger_type = 3;
        };
    };
    
    CrisisDetectionResult {
        is_crisis,
        trigger_type,
        volatility_bps,
        liquidity_remaining_bps,
        avg_spread_bps: current_spread_bps,
        timestamp: clock::timestamp_ms(clock),
    }
}

/// Calculate price volatility between two prices
/// Returns percentage change in basis points
public fun calculate_volatility(
    previous_price: u64,
    current_price: u64,
): u64 {
    if (previous_price == 0) {
        return 0
    };
    
    let price_diff = if (current_price > previous_price) {
        current_price - previous_price
    } else {
        previous_price - current_price
    };
    
    // Return percentage change in bps (1% = 100 bps)
    (price_diff * 10000) / previous_price
}

/// Calculate average spread from a list of spreads
public fun calculate_avg_spread(spreads: vector<u64>): u64 {
    let len = vector::length(&spreads);
    if (len == 0) {
        return 0
    };
    
    let mut sum = 0u64;
    let mut i = 0;
    
    while (i < len) {
        sum = sum + *vector::borrow(&spreads, i);
        i = i + 1;
    };
    
    sum / len
}

/// Check if market has stabilized after crisis
public fun check_stabilization(
    current_volatility_bps: u64,
    current_liquidity_bps: u64,
    current_spread_bps: u64,
): bool {
    // Market is stable if:
    // - Volatility < 2000 bps (20%)
    // - Liquidity > 7000 bps (70% of normal)
    // - Spreads < 500 bps (5x normal)
    current_volatility_bps < 2000 &&
    current_liquidity_bps > 7000 &&
    current_spread_bps < 500
}

/// Check if liquidity has drained significantly (>40% drop)
public fun check_liquidity_drain(
    previous_liquidity: u64,
    current_liquidity: u64,
): bool {
    if (previous_liquidity == 0) {
        return false
    };
    let remaining_bps = (current_liquidity * 10000) / previous_liquidity;
    remaining_bps < 6000 // Less than 60% remaining = significant drain
}

// ========================================================================
// TESTS
// ========================================================================

#[test]
fun test_calculate_volatility_price_increase() {
    let vol = calculate_volatility(1000, 1300);
    assert!(vol == 3000, 0); // 30% increase = 3000 bps
}

#[test]
fun test_calculate_volatility_price_decrease() {
    let vol = calculate_volatility(1000, 700);
    assert!(vol == 3000, 0); // 30% decrease = 3000 bps
}

#[test]
fun test_calculate_volatility_zero_previous() {
    let vol = calculate_volatility(0, 1000);
    assert!(vol == 0, 0); // Zero prev price returns 0
}

#[test]
fun test_calculate_volatility_no_change() {
    let vol = calculate_volatility(1000, 1000);
    assert!(vol == 0, 0);
}

#[test]
fun test_calculate_avg_spread_basic() {
    let mut spreads = vector::empty<u64>();
    vector::push_back(&mut spreads, 100);
    vector::push_back(&mut spreads, 200);
    vector::push_back(&mut spreads, 300);
    let avg = calculate_avg_spread(spreads);
    assert!(avg == 200, 0);
}

#[test]
fun test_calculate_avg_spread_empty() {
    let spreads = vector::empty<u64>();
    let avg = calculate_avg_spread(spreads);
    assert!(avg == 0, 0);
}

#[test]
fun test_check_stabilization_stable() {
    assert!(check_stabilization(1000, 8000, 300), 0);
}

#[test]
fun test_check_stabilization_high_volatility() {
    assert!(!check_stabilization(3000, 8000, 300), 0); // vol too high
}

#[test]
fun test_check_stabilization_low_liquidity() {
    assert!(!check_stabilization(1000, 5000, 300), 0); // liquidity too low
}

#[test]
fun test_check_stabilization_wide_spread() {
    assert!(!check_stabilization(1000, 8000, 600), 0); // spread too wide
}

#[test]
fun test_check_liquidity_drain_significant() {
    assert!(check_liquidity_drain(10000, 4000), 0); // 40% remaining
}

#[test]
fun test_check_liquidity_drain_minor() {
    assert!(!check_liquidity_drain(10000, 8000), 0); // 80% remaining
}

#[test]
fun test_check_liquidity_drain_zero_prev() {
    assert!(!check_liquidity_drain(0, 1000), 0); // zero prev → safe
}

#[test]
fun test_detect_crisis_volatility_trigger() {
    let mut ctx = tx_context::dummy();
    let clock = clock::create_for_testing(&mut ctx);
    // 40% price drop: 1000 → 600 = 4000 bps volatility (> 3000)
    let result = detect_crisis(1000, 600, 10000, 10000, 50, &clock);
    assert!(result.is_crisis == true, 0);
    assert!(result.trigger_type == 1, 1); // Volatility trigger
    clock.destroy_for_testing();
}

#[test]
fun test_detect_crisis_liquidity_trigger() {
    let mut ctx = tx_context::dummy();
    let clock = clock::create_for_testing(&mut ctx);
    // Liquidity drops from 10000 to 4000 = 4000 bps remaining (< 6000)
    let result = detect_crisis(1000, 1000, 10000, 4000, 50, &clock);
    assert!(result.is_crisis == true, 0);
    assert!(result.trigger_type == 2, 1); // Liquidity trigger
    clock.destroy_for_testing();
}

#[test]
fun test_detect_crisis_spread_trigger() {
    let mut ctx = tx_context::dummy();
    let clock = clock::create_for_testing(&mut ctx);
    // Spread > 1000 bps
    let result = detect_crisis(1000, 1000, 10000, 10000, 1500, &clock);
    assert!(result.is_crisis == true, 0);
    assert!(result.trigger_type == 3, 1); // Spread trigger
    clock.destroy_for_testing();
}

#[test]
fun test_no_crisis_normal_market() {
    let mut ctx = tx_context::dummy();
    let clock = clock::create_for_testing(&mut ctx);
    // Normal conditions: 5% vol, 90% liquidity, 50 bps spread
    let result = detect_crisis(1000, 1050, 10000, 9000, 50, &clock);
    assert!(result.is_crisis == false, 0);
    assert!(result.trigger_type == 0, 1);
    clock.destroy_for_testing();
}
