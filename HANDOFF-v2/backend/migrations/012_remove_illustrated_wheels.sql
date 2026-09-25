-- Retire the original illustrated wheel placeholders and use real wheel photography.
ALTER TABLE wheel_color_options ADD COLUMN preview_asset TEXT;
UPDATE wheel_color_options SET preview_asset='/wheel-finishes/wheel-color-black-gloss.webp' WHERE id='wheel-color-black-gloss';
UPDATE wheel_color_options SET preview_asset='/wheel-finishes/wheel-color-black-matte.webp' WHERE id='wheel-color-black-matte';
UPDATE wheel_color_options SET preview_asset='/wheel-finishes/wheel-color-graphite.webp' WHERE id='wheel-color-graphite';
UPDATE wheel_color_options SET preview_asset='/wheel-finishes/wheel-color-bronze.webp' WHERE id='wheel-color-bronze';
UPDATE wheel_color_options SET preview_asset='/wheel-finishes/wheel-color-gold.webp' WHERE id='wheel-color-gold';
UPDATE wheel_color_options SET preview_asset='/wheel-finishes/wheel-color-silver.webp' WHERE id='wheel-color-silver';
UPDATE wheel_color_options SET preview_asset='/wheel-finishes/wheel-color-white.webp' WHERE id='wheel-color-white';
UPDATE wheel_color_options SET preview_asset='/wheel-finishes/wheel-color-copper.webp' WHERE id='wheel-color-copper';
UPDATE wheel_models SET visible=0 WHERE image_rights_basis='Original catalog illustration';
