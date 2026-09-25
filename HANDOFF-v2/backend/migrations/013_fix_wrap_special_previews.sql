-- The three legacy special finishes use hyphenated ids. Keep their image paths
-- explicit so upgraded databases receive the same previews as fresh installs.
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-deep-navy-metallic.webp' WHERE id='wrap-deep-navy-metallic';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ice-silver-metallic.webp' WHERE id='wrap-ice-silver-metallic';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-champagne-pearl.webp' WHERE id='wrap-champagne-pearl';
