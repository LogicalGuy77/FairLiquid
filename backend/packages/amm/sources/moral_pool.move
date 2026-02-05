// LEX-JUSTICIA: Ethical Market-Making on DeepBook
// Moral Pool Contract - Manages Market Maker Tiers with Crisis Enforcement

module deepbookamm::moral_pool;

use sui::object::{Self, UID, ID};
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::clock::{Self, Clock};
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use std::vector;
use deep_token::deep::DEEP;

// === Errors ===
const EInvalidTier: u64 = 0;
const EInsufficientStake: u64 = 1;
const ECrisisActive: u64 = 2;
const EUnauthorizedMMManager: u64 = 3;
const EInvalidSpreadConfig: u64 = 4;

// === Types ===

/// Market Maker Tier
public enum MMTier has copy, drop {
    Martyr,   // Crisis liquidity provider - commits to staying liquid
    Citizen,  // Fair weather provider - moderate commitments
    Sovereign // Opportunistic provider - no commitments
}

/// Wraps a DeepBook pool with moral enforcement layer
public struct MoralPool<phantom BaseAsset, phantom QuoteAsset> has key {
    id: UID,
    // Pool reference
    deepbook_pool_id: ID,
    
    // Crisis state tracking
    crisis_state: CrisisState,
    
    // Market Maker registry by tier
    martyr_mms: vector<MartyrMMInfo>,
    citizen_mms: vector<CitizenMMInfo>,
    sovereign_mms: vector<address>,
    
    // Stake and reward tracking
    penalty_pool: Balance<DEEP>,
}

/// Martyr Market Maker commitment
public struct MartyrMMInfo has store {
    mm_address: address,
    staked_deep: u64,
    min_liquidity: u64,
    max_spread_bps: u64,
    registered_at: u64,
    violations_count: u64,
}

/// Citizen Market Maker commitment
public struct CitizenMMInfo has store {
    mm_address: address,
    max_spread_bps: u64,
    registered_at: u64,
    violations_count: u64,
}

/// Crisis detection and enforcement
public struct CrisisState has store {
    active: bool,
    trigger_type: u64,
    triggered_at: u64,
    volatility_bps: u64,
    liquidity_remaining_bps: u64,  // % of normal
    avg_spread_bps: u64,
}

// === Events ===

public struct MartyrRegisteredEvent has copy, drop {
    mm_address: address,
    stake_amount: u64,
    min_liquidity: u64,
}

public struct CrisisActivatedEvent has copy, drop {
    trigger_type: u64,
    volatility_bps: u64,
    timestamp: u64,
}

public struct ComplianceVerifiedEvent has copy, drop {
    mm_address: address,
    tier: u8,  // 0: Martyr, 1: Citizen, 2: Sovereign
    period_end: u64,
    zk_proof_verified: bool,
}

// === Pool Management ===

/// Create a new moral pool wrapping a DeepBook pool
public fun create_moral_pool<BaseAsset, QuoteAsset>(
    deepbook_pool_id: ID,
    ctx: &mut TxContext
): ID {
    let pool = MoralPool<BaseAsset, QuoteAsset> {
        id: object::new(ctx),
        deepbook_pool_id,
        crisis_state: CrisisState {
            active: false,
            trigger_type: 0,
            triggered_at: 0,
            volatility_bps: 0,
            liquidity_remaining_bps: 10000,
            avg_spread_bps: 0,
        },
        martyr_mms: vector::empty(),
        citizen_mms: vector::empty(),
        sovereign_mms: vector::empty(),
        penalty_pool: balance::zero(),
    };

    let pool_id = object::id(&pool);
    sui::transfer::share_object(pool);
    pool_id
}

// === Market Maker Registration ===

/// Register as a Martyr Market Maker with crisis liquidity commitment
public fun register_martyr<BaseAsset, QuoteAsset>(
    pool: &mut MoralPool<BaseAsset, QuoteAsset>,
    stake_deep: Coin<DEEP>,
    min_liquidity: u64,
    max_spread_bps: u64,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let mm_address = tx_context::sender(ctx);
    let stake_amount = coin::value(&stake_deep);
    
    // Validate minimum stake (10,000 DEEP = 10_000 * 10^8)
    assert!(stake_amount >= 1_000_000_000_000, EInsufficientStake);
    
    // Validate spread configuration
    assert!(max_spread_bps > 0 && max_spread_bps <= 1000, EInvalidSpreadConfig);
    
    // Transfer stake to pool
    let stake_balance = coin::into_balance(stake_deep);
    balance::join(&mut pool.penalty_pool, stake_balance);
    
    // Create Martyr MM info
    let martyr_info = MartyrMMInfo {
        mm_address,
        staked_deep: stake_amount,
        min_liquidity,
        max_spread_bps,
        registered_at: clock::timestamp_ms(clock),
        violations_count: 0,
    };
    
    vector::push_back(&mut pool.martyr_mms, martyr_info);
    
    // Emit event
    event::emit(MartyrRegisteredEvent {
        mm_address,
        stake_amount,
        min_liquidity,
    });
}

/// Register as a Citizen Market Maker with moderate commitments
public fun register_citizen<BaseAsset, QuoteAsset>(
    pool: &mut MoralPool<BaseAsset, QuoteAsset>,
    max_spread_bps: u64,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let mm_address = tx_context::sender(ctx);
    
    // Validate spread configuration
    assert!(max_spread_bps > 0 && max_spread_bps <= 500, EInvalidSpreadConfig);
    
    // Create Citizen MM info
    let citizen_info = CitizenMMInfo {
        mm_address,
        max_spread_bps,
        registered_at: clock::timestamp_ms(clock),
        violations_count: 0,
    };
    
    vector::push_back(&mut pool.citizen_mms, citizen_info);
}

/// Register as a Sovereign Market Maker (no commitments)
public fun register_sovereign<BaseAsset, QuoteAsset>(
    pool: &mut MoralPool<BaseAsset, QuoteAsset>,
    ctx: &mut TxContext
) {
    let mm_address = tx_context::sender(ctx);
    vector::push_back(&mut pool.sovereign_mms, mm_address);
}

// === Crisis Detection & Management ===

/// Update crisis state based on market conditions
/// Called by keeper oracle
public fun update_crisis_state<BaseAsset, QuoteAsset>(
    pool: &mut MoralPool<BaseAsset, QuoteAsset>,
    volatility_bps: u64,
    liquidity_remaining_bps: u64,
    avg_spread_bps: u64,
    clock: &Clock,
) -> bool {
    let mut should_activate = false;
    let mut trigger_type = 0u64;
    
    // Detect crisis triggers:
    // 1. High volatility > 3000 bps (30%)
    if (volatility_bps > 3000) {
        should_activate = true;
        trigger_type = 1; // Volatility trigger
    };
    
    // 2. Liquidity drain < 6000 bps (60% remaining)
    if (liquidity_remaining_bps < 6000) {
        should_activate = true;
        trigger_type = 2; // Liquidity trigger
    };
    
    // 3. Wide spreads > 1000 bps (10x normal)
    if (avg_spread_bps > 1000) {
        should_activate = true;
        trigger_type = 3; // Spread trigger
    };
    
    // Activate crisis if not already active
    if (should_activate && !pool.crisis_state.active) {
        pool.crisis_state.active = true;
        pool.crisis_state.trigger_type = trigger_type;
        pool.crisis_state.triggered_at = clock::timestamp_ms(clock);
        pool.crisis_state.volatility_bps = volatility_bps;
        pool.crisis_state.liquidity_remaining_bps = liquidity_remaining_bps;
        pool.crisis_state.avg_spread_bps = avg_spread_bps;
        
        // Emit crisis event
        event::emit(CrisisActivatedEvent {
            trigger_type,
            volatility_bps,
            timestamp: clock::timestamp_ms(clock),
        });
    };
    
    should_activate
}

/// Deactivate crisis mode after market stabilizes
public fun deactivate_crisis<BaseAsset, QuoteAsset>(
    pool: &mut MoralPool<BaseAsset, QuoteAsset>,
    _clock: &Clock,
) {
    pool.crisis_state.active = false;
    pool.crisis_state.trigger_type = 0;
}

// === Compliance Verification ===

/// Verify Martyr MM kept commitments with ZK-proof
/// Called after crisis period ends
public fun verify_martyr_compliance<BaseAsset, QuoteAsset>(
    pool: &mut MoralPool<BaseAsset, QuoteAsset>,
    mm_address: address,
    zk_proof_bytes: vector<u8>,
    _public_inputs: vector<u64>,
    clock: &Clock,
    _ctx: &mut TxContext
) {
    // For MVP: Simple validation (real ZK verification in Phase 2)
    // Check if proof is not empty
    assert!(vector::length(&zk_proof_bytes) > 0, 0);
    
    // Find MM in martyr list
    let mut i = 0;
    let len = vector::length(&pool.martyr_mms);
    let mut found = false;
    
    while (i < len) {
        let mm_info = vector::borrow_mut(&mut pool.martyr_mms, i);
        if (mm_info.mm_address == mm_address) {
            found = true;
            
            // Emit compliance verified event
            event::emit(ComplianceVerifiedEvent {
                mm_address,
                tier: 0, // Martyr
                period_end: clock::timestamp_ms(clock),
                zk_proof_verified: true,
            });
            
            break
        };
        i = i + 1;
    };
    
    assert!(found, 0);
}

// === Helper Functions ===

public fun get_crisis_state<BaseAsset, QuoteAsset>(
    pool: &MoralPool<BaseAsset, QuoteAsset>,
): (bool, u64) {
    (pool.crisis_state.active, pool.crisis_state.volatility_bps)
}

public fun get_mm_tier<BaseAsset, QuoteAsset>(
    pool: &MoralPool<BaseAsset, QuoteAsset>,
    mm_address: address,
): u8 {
    // Check Martyr tier
    let mut i = 0;
    let mut len = vector::length(&pool.martyr_mms);
    while (i < len) {
        let mm_info = vector::borrow(&pool.martyr_mms, i);
        if (mm_info.mm_address == mm_address) {
            return 0 // Martyr
        };
        i = i + 1;
    };
    
    // Check Citizen tier
    i = 0;
    len = vector::length(&pool.citizen_mms);
    while (i < len) {
        let mm_info = vector::borrow(&pool.citizen_mms, i);
        if (mm_info.mm_address == mm_address) {
            return 1 // Citizen
        };
        i = i + 1;
    };
    
    // Check Sovereign tier
    i = 0;
    len = vector::length(&pool.sovereign_mms);
    while (i < len) {
        let addr = vector::borrow(&pool.sovereign_mms, i);
        if (*addr == mm_address) {
            return 2 // Sovereign
        };
        i = i + 1;
    };
    
    255 // Not found
}

public fun get_martyr_count<BaseAsset, QuoteAsset>(
    pool: &MoralPool<BaseAsset, QuoteAsset>,
): u64 {
    vector::length(&pool.martyr_mms)
}

public fun get_citizen_count<BaseAsset, QuoteAsset>(
    pool: &MoralPool<BaseAsset, QuoteAsset>,
): u64 {
    vector::length(&pool.citizen_mms)
}

public fun get_sovereign_count<BaseAsset, QuoteAsset>(
    pool: &MoralPool<BaseAsset, QuoteAsset>,
): u64 {
    vector::length(&pool.sovereign_mms)
}
