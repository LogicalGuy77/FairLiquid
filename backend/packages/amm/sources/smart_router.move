// LEX-JUSTICIA: Ethical Market-Making on DeepBook
// Smart Order Router - Moral-aware order routing with tier prioritization

module deepbookamm::smart_router;

use std::vector;

/// Routing decision for an order
public struct RoutingDecision has copy, drop {
    mm_address: address,
    mm_tier: u8,  // 0: Martyr, 1: Citizen, 2: Sovereign
    priority: u64,
    allocated_quantity: u64,
}

/// Route market order with moral preferences
/// During crisis: prioritizes Martyr > Citizen > Sovereign
/// Normal: fair distribution among all MM tiers
public fun route_market_order(
    order_quantity: u64,
    is_crisis: bool,
    mm_addresses: vector<address>,
    mm_tiers: vector<u8>,
): vector<RoutingDecision> {
    let mut decisions = vector::empty<RoutingDecision>();
    let mm_count = vector::length(&mm_addresses);
    
    if (mm_count == 0) {
        return decisions
    };
    
    if (is_crisis) {
        // Crisis routing: prioritize by tier
        decisions = route_crisis_priority(
            order_quantity,
            mm_addresses,
            mm_tiers
        );
    } else {
        // Normal routing: fair distribution
        decisions = route_normal_fair(
            order_quantity,
            mm_addresses,
            mm_tiers
        );
    };
    
    decisions
}

/// Crisis routing: Allocate to Martyr first, then Citizen, then Sovereign
fun route_crisis_priority(
    order_quantity: u64,
    mm_addresses: vector<address>,
    mm_tiers: vector<u8>,
): vector<RoutingDecision> {
    let mut decisions = vector::empty<RoutingDecision>();
    let mm_count = vector::length(&mm_addresses);
    let mut remaining_quantity = order_quantity;
    
    // First pass: Martyr MMs (tier 0)
    let mut martyr_count = 0;
    let mut i = 0;
    while (i < mm_count) {
        if (*vector::borrow(&mm_tiers, i) == 0) {
            martyr_count = martyr_count + 1;
        };
        i = i + 1;
    };
    
    if (martyr_count > 0) {
        let quantity_per_martyr = remaining_quantity / martyr_count;
        i = 0;
        while (i < mm_count) {
            let tier = *vector::borrow(&mm_tiers, i);
            if (tier == 0) {
                let allocated = if (quantity_per_martyr > remaining_quantity) {
                    remaining_quantity
                } else {
                    quantity_per_martyr
                };
                
                vector::push_back(&mut decisions, RoutingDecision {
                    mm_address: *vector::borrow(&mm_addresses, i),
                    mm_tier: tier,
                    priority: 100,
                    allocated_quantity: allocated,
                });
                
                remaining_quantity = remaining_quantity - allocated;
            };
            i = i + 1;
        };
    };
    
    // Second pass: Citizen MMs (tier 1) if quantity remains
    if (remaining_quantity > 0) {
        let mut citizen_count = 0;
        i = 0;
        while (i < mm_count) {
            if (*vector::borrow(&mm_tiers, i) == 1) {
                citizen_count = citizen_count + 1;
            };
            i = i + 1;
        };
        
        if (citizen_count > 0) {
            let quantity_per_citizen = remaining_quantity / citizen_count;
            i = 0;
            while (i < mm_count) {
                let tier = *vector::borrow(&mm_tiers, i);
                if (tier == 1) {
                    let allocated = if (quantity_per_citizen > remaining_quantity) {
                        remaining_quantity
                    } else {
                        quantity_per_citizen
                    };
                    
                    vector::push_back(&mut decisions, RoutingDecision {
                        mm_address: *vector::borrow(&mm_addresses, i),
                        mm_tier: tier,
                        priority: 30,
                        allocated_quantity: allocated,
                    });
                    
                    remaining_quantity = remaining_quantity - allocated;
                };
                i = i + 1;
            };
        };
    };
    
    // Third pass: Sovereign MMs (tier 2) if quantity still remains
    if (remaining_quantity > 0) {
        let mut sovereign_count = 0;
        i = 0;
        while (i < mm_count) {
            if (*vector::borrow(&mm_tiers, i) == 2) {
                sovereign_count = sovereign_count + 1;
            };
            i = i + 1;
        };
        
        if (sovereign_count > 0) {
            let quantity_per_sovereign = remaining_quantity / sovereign_count;
            i = 0;
            while (i < mm_count) {
                let tier = *vector::borrow(&mm_tiers, i);
                if (tier == 2) {
                    let allocated = if (quantity_per_sovereign > remaining_quantity) {
                        remaining_quantity
                    } else {
                        quantity_per_sovereign
                    };
                    
                    vector::push_back(&mut decisions, RoutingDecision {
                        mm_address: *vector::borrow(&mm_addresses, i),
                        mm_tier: tier,
                        priority: 5,
                        allocated_quantity: allocated,
                    });
                    
                    remaining_quantity = remaining_quantity - allocated;
                };
                i = i + 1;
            };
        };
    };
    
    decisions
}

/// Normal routing: Fair distribution among all MMs
fun route_normal_fair(
    order_quantity: u64,
    mm_addresses: vector<address>,
    mm_tiers: vector<u8>,
): vector<RoutingDecision> {
    let mut decisions = vector::empty<RoutingDecision>();
    let mm_count = vector::length(&mm_addresses);
    
    if (mm_count == 0) {
        return decisions
    };
    
    let quantity_per_mm = order_quantity / mm_count;
    let mut i = 0;
    
    while (i < mm_count) {
        let tier = *vector::borrow(&mm_tiers, i);
        let priority = calculate_priority(tier, false);
        
        vector::push_back(&mut decisions, RoutingDecision {
            mm_address: *vector::borrow(&mm_addresses, i),
            mm_tier: tier,
            priority,
            allocated_quantity: quantity_per_mm,
        });
        
        i = i + 1;
    };
    
    decisions
}

/// Calculate routing priority based on tier and market condition
public fun calculate_priority(
    mm_tier: u8,
    is_crisis: bool,
): u64 {
    if (is_crisis) {
        // Crisis priorities
        if (mm_tier == 0) { 100 }  // Martyr: highest
        else if (mm_tier == 1) { 30 }  // Citizen: medium
        else { 5 }  // Sovereign: lowest
    } else {
        // Normal priorities (more balanced)
        if (mm_tier == 0) { 50 }  // Martyr: medium-high
        else if (mm_tier == 1) { 20 }  // Citizen: medium
        else { 10 }  // Sovereign: baseline
    }
}

// ========================================================================
// TESTS
// ========================================================================

#[test]
fun test_crisis_routing_martyrs_first() {
    let mut addrs = vector::empty<address>();
    vector::push_back(&mut addrs, @0x1); // Sovereign
    vector::push_back(&mut addrs, @0x2); // Martyr
    vector::push_back(&mut addrs, @0x3); // Citizen

    let mut tiers = vector::empty<u8>();
    vector::push_back(&mut tiers, 2); // Sovereign
    vector::push_back(&mut tiers, 0); // Martyr
    vector::push_back(&mut tiers, 1); // Citizen

    let decisions = route_market_order(1000, true, addrs, tiers);

    // First decision should be for Martyr (tier 0) with priority 100
    let first = vector::borrow(&decisions, 0);
    assert!(first.mm_tier == 0, 0);
    assert!(first.priority == 100, 1);
    assert!(first.allocated_quantity == 1000, 2); // Martyr gets all
}

#[test]
fun test_crisis_routing_cascades_to_citizens() {
    // Only citizens and sovereigns, no martyrs
    let mut addrs = vector::empty<address>();
    vector::push_back(&mut addrs, @0x1); // Citizen
    vector::push_back(&mut addrs, @0x2); // Sovereign
    vector::push_back(&mut addrs, @0x3); // Citizen

    let mut tiers = vector::empty<u8>();
    vector::push_back(&mut tiers, 1);
    vector::push_back(&mut tiers, 2);
    vector::push_back(&mut tiers, 1);

    let decisions = route_market_order(1000, true, addrs, tiers);
    let len = vector::length(&decisions);
    assert!(len >= 1, 0);

    // Citizens should be allocated first (priority 30)
    let first = vector::borrow(&decisions, 0);
    assert!(first.mm_tier == 1, 1);
    assert!(first.priority == 30, 2);
}

#[test]
fun test_normal_routing_fair_distribution() {
    let mut addrs = vector::empty<address>();
    vector::push_back(&mut addrs, @0x1);
    vector::push_back(&mut addrs, @0x2);

    let mut tiers = vector::empty<u8>();
    vector::push_back(&mut tiers, 0);
    vector::push_back(&mut tiers, 2);

    let decisions = route_market_order(1000, false, addrs, tiers);
    assert!(vector::length(&decisions) == 2, 0);

    // Each MM gets equal share: 1000 / 2 = 500
    let d1 = vector::borrow(&decisions, 0);
    let d2 = vector::borrow(&decisions, 1);
    assert!(d1.allocated_quantity == 500, 1);
    assert!(d2.allocated_quantity == 500, 2);
}

#[test]
fun test_empty_mm_list() {
    let decisions = route_market_order(
        1000, true, vector::empty(), vector::empty()
    );
    assert!(vector::length(&decisions) == 0, 0);
}

#[test]
fun test_calculate_priority_crisis_values() {
    assert!(calculate_priority(0, true) == 100, 0);  // Martyr
    assert!(calculate_priority(1, true) == 30, 1);   // Citizen
    assert!(calculate_priority(2, true) == 5, 2);    // Sovereign
}

#[test]
fun test_calculate_priority_normal_values() {
    assert!(calculate_priority(0, false) == 50, 0);  // Martyr
    assert!(calculate_priority(1, false) == 20, 1);  // Citizen
    assert!(calculate_priority(2, false) == 10, 2);  // Sovereign
}

#[test]
fun test_single_martyr_gets_all_in_crisis() {
    let mut addrs = vector::empty<address>();
    vector::push_back(&mut addrs, @0xA);

    let mut tiers = vector::empty<u8>();
    vector::push_back(&mut tiers, 0); // Martyr

    let decisions = route_market_order(5000, true, addrs, tiers);
    assert!(vector::length(&decisions) == 1, 0);

    let d = vector::borrow(&decisions, 0);
    assert!(d.allocated_quantity == 5000, 1);
    assert!(d.mm_address == @0xA, 2);
}
