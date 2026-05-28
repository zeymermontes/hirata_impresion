-- Minimum-quantity gating + "buy X get Y" support on promotion rules.
--
-- `buy_x` is an optional quantity gate: when set, the rule only qualifies
-- if the cart contains at least that many *qualifying units* (counted by
-- the rule's scope — same scoping as min_subtotal).
--
-- The new `buy_x_get_y` rule type uses buy_x as the X and reuses
-- `discount_value` as Y (the number of free units granted).

alter table promotion_rules
  add column if not exists buy_x int;

alter type promotion_rule_type add value if not exists 'buy_x_get_y';
