-- Catalog options are server-owned: the browser sends stable ids and never
-- controls the instruction sent to the image model.
CREATE TABLE tint_levels (
  id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
  vlt_percent INTEGER NOT NULL CHECK (vlt_percent BETWEEN 0 AND 100),
  prompt_fragment TEXT NOT NULL, preview_swatch TEXT NOT NULL,
  sort_order INTEGER NOT NULL, is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);
CREATE TABLE tint_zones (
  id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
  prompt_fragment TEXT NOT NULL, sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);
CREATE TABLE wrap_finishes (
  id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
  prompt_fragment TEXT NOT NULL, sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);
CREATE TABLE wrap_colors (
  id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
  hex TEXT NOT NULL, family TEXT NOT NULL, sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);
CREATE TABLE wrap_options (
  id TEXT PRIMARY KEY, color_id TEXT NOT NULL, finish_id TEXT NOT NULL,
  display_name TEXT NOT NULL, preview_swatch TEXT NOT NULL,
  prompt_fragment TEXT NOT NULL, sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  UNIQUE(color_id, finish_id),
  FOREIGN KEY (color_id) REFERENCES wrap_colors(id),
  FOREIGN KEY (finish_id) REFERENCES wrap_finishes(id)
);
CREATE TABLE wheel_color_options (
  id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
  preview_swatch TEXT NOT NULL, finish_code TEXT NOT NULL,
  prompt_fragment TEXT NOT NULL, sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

ALTER TABLE wheel_models ADD COLUMN prompt_fragment TEXT;
ALTER TABLE wheel_variants ADD COLUMN spoke_style TEXT;
ALTER TABLE wheel_reference_images ADD COLUMN fal_url TEXT;
ALTER TABLE wheel_reference_images ADD COLUMN fal_uploaded_at TEXT;
ALTER TABLE wheel_reference_images ADD COLUMN watermark_free_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_versions ADD COLUMN cache_key TEXT;
ALTER TABLE project_versions ADD COLUMN prompt_version TEXT;
ALTER TABLE project_versions ADD COLUMN internal_cost_usd REAL NOT NULL DEFAULT 0;
ALTER TABLE source_assets ADD COLUMN content_sha256 TEXT;

CREATE TABLE generation_attempts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_generation_attempts_user_created ON generation_attempts(user_id, created_at DESC);
CREATE INDEX idx_generation_attempts_ip_created ON generation_attempts(ip_hash, created_at DESC);
CREATE UNIQUE INDEX idx_project_versions_cache_complete
  ON project_versions(project_id, cache_key) WHERE cache_key IS NOT NULL AND status = 'complete';

INSERT INTO tint_levels VALUES
 ('tint-removed','removed','Clear / removed',100,'Remove the dark window tint and make the glass clear and transparent. Do not invent a colored or bright interior. Keep the interior dark, neutral and barely visible through the glass.','rgba(75,90,104,.12)',10,1),
 ('tint-light','light','Light',70,'Apply a very light professional automotive window tint film, approximately 70% VLT.','rgba(24,32,39,.30)',20,1),
 ('tint-medium','medium','Medium',50,'Apply a professional automotive window tint film, approximately 50% VLT, with interior silhouettes still visible.','rgba(20,27,33,.48)',30,1),
 ('tint-dark','dark','Dark',35,'Apply a professional automotive window tint film, approximately 35% VLT.','rgba(15,21,27,.64)',40,1),
 ('tint-very-dark','very_dark','Very dark',20,'Apply a very dark professional automotive window tint film, approximately 20% VLT.','rgba(10,15,20,.79)',50,1),
 ('tint-limo','limo','Limo',5,'Apply a near-opaque professional automotive window tint film, approximately 5% VLT.','rgba(5,8,11,.94)',60,1);
INSERT INTO tint_zones VALUES
 ('zone-front-side','front_side','Front side windows','Apply the change only to the front side windows. Keep the windshield, rear side windows and rear glass unchanged.',10,1),
 ('zone-rear','rear_side_and_back','Rear windows','Apply the change only to the rear side windows and rear glass. Keep the windshield and front side windows unchanged.',20,1),
 ('zone-all','all_windows','All side + rear','Apply the change to all side windows and the rear glass. Keep the windshield unchanged.',30,1),
 ('zone-strip','windshield_strip','Windshield strip','Apply the change only as a narrow sun strip along the top edge of the windshield. Keep all other glass unchanged.',40,1);

INSERT INTO wrap_finishes VALUES
 ('finish-gloss','gloss','Gloss','gloss finish with natural clear-coat reflections',10,1),
 ('finish-satin','satin','Satin','smooth satin vinyl finish with soft controlled reflections',20,1),
 ('finish-matte','matte','Matte','matte finish, smooth and even, like a professional vinyl wrap, NOT primer, NOT unfinished',30,1),
 ('finish-metallic','metallic','Metallic','fine realistic metallic flake under a premium clear coat',40,1),
 ('finish-pearl','pearl','Pearl','subtle pearl finish with restrained color shift',50,1),
 ('finish-chrome','chrome','Chrome','professionally wrapped reflective chrome finish',60,1),
 ('finish-brushed','brushed','Brushed metal','fine directional brushed-metal vinyl texture',70,1),
 ('finish-carbon','carbon','Carbon','subtle realistic carbon-fiber vinyl weave',80,1);
INSERT INTO wrap_colors VALUES
 ('color-jet-black','jet_black','Jet Black','#161616','black',10,1),
 ('color-alpine-white','alpine_white','Alpine White','#D9D2C4','white',20,1),
 ('color-stealth-grey','stealth_grey','Stealth Grey','#54565C','grey',30,1),
 ('color-titanium','titanium','Titanium','#7A7D82','grey',40,1),
 ('color-deep-navy','deep_navy','Deep Navy','#1B2A4A','blue',50,1),
 ('color-slate-blue','slate_blue','Slate Blue','#3A4B5C','blue',60,1),
 ('color-racing-green','racing_green','Racing Green','#284536','green',70,1),
 ('color-emerald','emerald','Emerald','#1F5B46','green',80,1),
 ('color-ember-red','ember_red','Ember Red','#8F2727','red',90,1),
 ('color-burgundy','burgundy','Burgundy','#511F2A','red',100,1),
 ('color-sunburst','sunburst','Sunburst Orange','#C85E24','orange',110,1),
 ('color-champagne','champagne','Champagne','#B7A377','gold',120,1),
 ('color-bronze','bronze','Bronze','#81532D','brown',130,1),
 ('color-plum','plum','Deep Plum','#493047','purple',140,1),
 ('color-ice-silver','ice_silver','Ice Silver','#AEB3B6','silver',150,1),
 ('color-copper','copper','Copper','#9C5D32','brown',160,1);

-- 48 curated combinations: enough choice without presenting nonsensical pairs.
INSERT INTO wrap_options (id,color_id,finish_id,display_name,preview_swatch,prompt_fragment,sort_order,is_active)
SELECT 'wrap-'||c.code||'-'||f.code, c.id, f.id, c.display_name||' · '||f.display_name, c.hex,
 'Change the car body color to '||lower(c.display_name)||' using realistic factory-quality automotive color and a '||f.prompt_fragment||'. Elegant and subtle, not oversaturated, NOT chrome or mirror-like unless chrome was explicitly selected.',
 (c.sort_order * 10 + f.sort_order), 1
FROM wrap_colors c JOIN wrap_finishes f
WHERE f.code IN ('gloss','satin','matte')
  AND NOT (c.code='stealth_grey' AND f.code='matte');
INSERT INTO wrap_options VALUES
 ('wrap-deep-navy-metallic','color-deep-navy','finish-metallic','Deep Navy · Metallic','#1B2A4A','Change the car body color to a realistic factory deep navy blue metallic paint. Elegant and subtle, glossy but NOT chrome or mirror-like, not oversaturated, like real premium car paint.',9991,1),
 ('wrap-ice-silver-metallic','color-ice-silver','finish-metallic','Ice Silver · Metallic','#AEB3B6','Change the car body color to realistic factory ice silver metallic paint with fine restrained flake, not mirror-like.',9992,1),
 ('wrap-champagne-pearl','color-champagne','finish-pearl','Champagne · Pearl','#B7A377','Change the car body color to subtle champagne pearl automotive paint with realistic premium reflections, not oversaturated.',9993,1);

INSERT INTO wheel_color_options VALUES
 ('wheel-color-black-gloss','black_gloss','Black · Gloss','#161616','gloss','Recolor only the existing wheels in deep gloss black with realistic clear-coat reflections.',10,1),
 ('wheel-color-black-matte','black_matte','Black · Matte','#121212','matte','Recolor only the existing wheels in smooth professional matte black, not unfinished.',20,1),
 ('wheel-color-graphite','graphite','Graphite · Satin','#42454A','satin','Recolor only the existing wheels in satin graphite gunmetal.',30,1),
 ('wheel-color-bronze','bronze','Bronze · Satin','#8A5A2E','satin','Recolor only the existing wheels in refined satin bronze.',40,1),
 ('wheel-color-gold','gold','Gold · Metallic','#C7A24E','metallic','Recolor only the existing wheels in restrained metallic gold, not chrome.',50,1),
 ('wheel-color-silver','silver','Silver · Machined','#9A9C9F','brushed','Recolor only the existing wheels in bright machined silver with fine brushed-metal detail.',60,1),
 ('wheel-color-white','white','White · Gloss','#D9D2C4','gloss','Recolor only the existing wheels in clean gloss white.',70,1),
 ('wheel-color-copper','copper','Copper · Satin','#A9662F','satin','Recolor only the existing wheels in subtle satin copper.',80,1);

UPDATE wheel_models SET prompt_fragment = CASE slug
 WHEN '437m' THEN 'large five double-spoke sport wheel with a machined face and dark inner barrels'
 WHEN 'ch-r' THEN 'motorsport-inspired multi-spoke wheel with a defined rim protector edge'
 WHEN 'hf-3' THEN 'modern split five-spoke concave performance wheel'
 WHEN 'tmb' THEN 'geometric mesh-style wheel with a deep technical face'
 END;
UPDATE wheel_variants SET spoke_style = CASE
 WHEN model_id IN ('model-437m','model-hf3') THEN '5_spoke'
 WHEN model_id='model-chr' THEN 'multi_spoke'
 ELSE 'mesh' END;
-- Existing drawings are project-owned and generated locally; mark the explicit
-- manual watermark confirmation required by the publish guard.
UPDATE wheel_reference_images SET watermark_free_confirmed = 1
 WHERE rights_source='Project Drive' AND rights_basis='Original catalog illustration';
