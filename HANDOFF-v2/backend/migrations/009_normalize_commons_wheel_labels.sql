-- Migration 008 was exercised against the local development database while
-- the first curated batch was being reviewed. Keep already migrated databases
-- aligned with the final, honest color/finish labels and canonical style codes.
UPDATE wheel_variants SET color = CASE id
  WHEN 'wheel-commons-aez-valencia-d' THEN 'Silver / black'
  WHEN 'wheel-commons-ats-amg-penta' THEN 'Black'
  WHEN 'wheel-commons-brabus-monoblock' THEN 'Silver'
  WHEN 'wheel-commons-borbet-tuning-world' THEN 'Silver'
  WHEN 'wheel-commons-bbs-rx2' THEN 'Silver'
  WHEN 'wheel-commons-bbs-rs764' THEN 'Silver'
  WHEN 'wheel-commons-impul-d01' THEN 'White / black'
  WHEN 'wheel-commons-work-equip-04' THEN 'Bronze'
  WHEN 'wheel-commons-oz-35-anniversary' THEN 'Black / silver'
  WHEN 'wheel-commons-dotz-mugello' THEN 'Black / red'
  WHEN 'wheel-commons-rays-f1-front' THEN 'Gunmetal'
  WHEN 'wheel-commons-porsche-997-carrera-4s' THEN 'Silver'
  ELSE color END,
  finish = CASE id
  WHEN 'wheel-commons-aez-valencia-d' THEN 'Machined'
  WHEN 'wheel-commons-ats-amg-penta' THEN 'Polished lip'
  WHEN 'wheel-commons-brabus-monoblock' THEN 'Machined'
  WHEN 'wheel-commons-borbet-tuning-world' THEN 'Polished'
  WHEN 'wheel-commons-bbs-rx2' THEN 'Machined'
  WHEN 'wheel-commons-bbs-rs764' THEN 'Painted'
  WHEN 'wheel-commons-impul-d01' THEN 'Polished lip'
  WHEN 'wheel-commons-work-equip-04' THEN 'Polished lip'
  WHEN 'wheel-commons-oz-35-anniversary' THEN 'Machined'
  WHEN 'wheel-commons-dotz-mugello' THEN 'Machined'
  WHEN 'wheel-commons-rays-f1-front' THEN 'Satin'
  WHEN 'wheel-commons-porsche-997-carrera-4s' THEN 'Machined'
  ELSE finish END,
  spoke_style = CASE id
  WHEN 'wheel-commons-aez-valencia-d' THEN 'multi_spoke'
  WHEN 'wheel-commons-ats-amg-penta' THEN '5_spoke'
  WHEN 'wheel-commons-brabus-monoblock' THEN 'monoblock'
  WHEN 'wheel-commons-borbet-tuning-world' THEN 'multi_piece'
  WHEN 'wheel-commons-bbs-rx2' THEN 'split_spoke'
  WHEN 'wheel-commons-bbs-rs764' THEN 'mesh'
  WHEN 'wheel-commons-impul-d01' THEN 'aero_disc'
  WHEN 'wheel-commons-work-equip-04' THEN '4_spoke'
  WHEN 'wheel-commons-oz-35-anniversary' THEN 'multi_spoke'
  WHEN 'wheel-commons-dotz-mugello' THEN 'split_5_spoke'
  WHEN 'wheel-commons-rays-f1-front' THEN 'motorsport'
  WHEN 'wheel-commons-porsche-997-carrera-4s' THEN 'oem_sport'
  ELSE spoke_style END
WHERE id LIKE 'wheel-commons-%';
