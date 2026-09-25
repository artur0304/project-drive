-- Replace the project-made roll illustrations with honest material previews.
-- Only products whose manufacturer photo and name were verified are shown as
-- photography; the rest deliberately fall back to a plain colour sample.
ALTER TABLE wrap_options ADD COLUMN brand TEXT;
ALTER TABLE wrap_options ADD COLUMN series TEXT;
ALTER TABLE wrap_options ADD COLUMN product_code TEXT;
ALTER TABLE wrap_options ADD COLUMN source_url TEXT;

UPDATE wrap_options SET preview_asset = NULL;

INSERT OR IGNORE INTO wrap_finishes
  (id,code,display_name,prompt_fragment,sort_order,is_active)
VALUES
  ('finish-high-gloss','high_gloss','High Gloss','high-gloss vinyl finish with deep, natural reflections',5,1);

INSERT OR IGNORE INTO wrap_colors
  (id,code,display_name,hex,family,sort_order,is_active)
VALUES
  ('color-3m-high-gloss-red','3m_high_gloss_red','High Gloss Red','#B5262D','red',1,1),
  ('color-3m-golden-aurora','3m_golden_aurora','Golden Aurora','#A28142','gold',2,1),
  ('color-3m-strawberry-red','3m_strawberry_red','Strawberry Red','#A63846','red',3,1);

INSERT OR IGNORE INTO wrap_options
  (id,color_id,finish_id,display_name,preview_swatch,prompt_fragment,sort_order,is_active,
   preview_asset,brand,series,product_code,source_url)
VALUES
  ('wrap-3m-high-gloss-red','color-3m-high-gloss-red','finish-high-gloss','3M 2080 · High Gloss Red','#B5262D',
   'Change the car body color to high-gloss red using realistic premium automotive wrap film with deep natural reflections. Keep the exact body geometry, panel gaps and lighting.',-30,1,
   'https://multimedia.3m.com/mws/media/2274253J/3m-wrap-film-2080-high-gloss-red-roll.jpg','3M','2080',NULL,
   'https://www.3m.com/3M/en_US/p/d/b5005081006/'),
  ('wrap-3m-sp264-golden-aurora','color-3m-golden-aurora','finish-satin','3M 2080 · Satin Flip Golden Aurora','#A28142',
   'Change the car body color to satin flip golden aurora using realistic premium automotive wrap film with a restrained warm color shift and soft reflections. Keep the exact body geometry, panel gaps and lighting.',-20,1,
   'https://multimedia.3m.com/mws/media/2591956J/3m-wrap-film-2080-sp264-satin-flip-golden-aurora.jpg','3M','2080','SP264',
   'https://www.3m.com/3M/en_US/p/d/b5005081006/'),
  ('wrap-3m-m33-strawberry-red','color-3m-strawberry-red','finish-matte','3M 2080 · Matte Strawberry Red','#A63846',
   'Change the car body color to matte strawberry red using realistic premium automotive wrap film with an even non-gloss surface. Keep the exact body geometry, panel gaps and lighting.',-10,1,
   'https://multimedia.3m.com/mws/media/2591941J/3m-wrap-film-2080-m33-matte-strawberry-red.jpg','3M','2080','M33',
   'https://www.3m.com/3M/en_US/p/d/b5005081006/');
