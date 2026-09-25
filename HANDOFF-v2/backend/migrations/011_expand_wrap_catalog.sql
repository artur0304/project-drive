-- A larger, photo-led vinyl catalog for the configurator. Images are original
-- project assets rendered by scripts/build-wrap-catalog.mjs; no shop photography is copied.
ALTER TABLE wrap_options ADD COLUMN preview_asset TEXT;

INSERT INTO wrap_colors (id,code,display_name,hex,family,sort_order,is_active) VALUES
 ('color-onyx_black','onyx_black','Onyx Black','#0D0E10','black',170,1),
 ('color-piano_black','piano_black','Piano Black','#090909','black',180,1),
 ('color-blue_black','blue_black','Blue Black','#101820','black',190,1),
 ('color-pure_white','pure_white','Pure White','#F2F1EB','white',200,1),
 ('color-ivory_white','ivory_white','Ivory White','#E5DDC9','white',210,1),
 ('color-chalk_white','chalk_white','Chalk White','#C9C4B8','white',220,1),
 ('color-concrete_grey','concrete_grey','Concrete Grey','#85878A','grey',230,1),
 ('color-storm_grey','storm_grey','Storm Grey','#43474D','grey',240,1),
 ('color-anthracite','anthracite','Anthracite','#30343A','grey',250,1),
 ('color-battleship_grey','battleship_grey','Battleship Grey','#62666B','grey',260,1),
 ('color-liquid_silver','liquid_silver','Liquid Silver','#BBC1C5','silver',270,1),
 ('color-aluminium','aluminium','Aluminium','#949A9E','silver',280,1),
 ('color-cobalt_blue','cobalt_blue','Cobalt Blue','#154C9A','blue',290,1),
 ('color-riviera_blue','riviera_blue','Riviera Blue','#32A6D7','blue',300,1),
 ('color-midnight_blue','midnight_blue','Midnight Blue','#101D3C','blue',310,1),
 ('color-petrol_blue','petrol_blue','Petrol Blue','#14566A','blue',320,1),
 ('color-forest_green','forest_green','Forest Green','#183D2C','green',330,1),
 ('color-olive_green','olive_green','Olive Green','#596044','green',340,1),
 ('color-khaki_green','khaki_green','Khaki Green','#77735C','green',350,1),
 ('color-mint_green','mint_green','Mint Green','#86B8A4','green',360,1),
 ('color-carmine_red','carmine_red','Carmine Red','#B3262D','red',370,1),
 ('color-rosso_red','rosso_red','Rosso Red','#D12A2E','red',380,1),
 ('color-wine_red','wine_red','Wine Red','#641D2E','red',390,1),
 ('color-burnt_orange','burnt_orange','Burnt Orange','#B44E1D','orange',400,1),
 ('color-papaya_orange','papaya_orange','Papaya Orange','#E66A23','orange',410,1),
 ('color-signal_yellow','signal_yellow','Signal Yellow','#E3B91E','yellow',420,1),
 ('color-mustard_yellow','mustard_yellow','Mustard Yellow','#B99125','yellow',430,1),
 ('color-desert_sand','desert_sand','Desert Sand','#B6A27A','gold',440,1),
 ('color-coffee_brown','coffee_brown','Coffee Brown','#4C352C','brown',450,1),
 ('color-midnight_purple','midnight_purple','Midnight Purple','#28213E','purple',460,1),
 ('color-lavender','lavender','Lavender','#82739F','purple',470,1),
 ('color-aubergine','aubergine','Aubergine','#3F263D','purple',480,1);

INSERT OR IGNORE INTO wrap_options
  (id,color_id,finish_id,display_name,preview_swatch,prompt_fragment,sort_order,is_active)
SELECT 'wrap-'||c.code||'-'||f.code, c.id, f.id, c.display_name||' · '||f.display_name, c.hex,
 'Change the car body color to '||lower(c.display_name)||' using realistic factory-quality automotive vinyl and a '||f.prompt_fragment||'. Keep panel gaps, reflections and body geometry realistic; avoid oversaturation.',
 (c.sort_order * 10 + f.sort_order), 1
FROM wrap_colors c JOIN wrap_finishes f
WHERE c.id IN ('color-onyx_black','color-piano_black','color-blue_black','color-pure_white','color-ivory_white','color-chalk_white','color-concrete_grey','color-storm_grey','color-anthracite','color-battleship_grey','color-liquid_silver','color-aluminium','color-cobalt_blue','color-riviera_blue','color-midnight_blue','color-petrol_blue','color-forest_green','color-olive_green','color-khaki_green','color-mint_green','color-carmine_red','color-rosso_red','color-wine_red','color-burnt_orange','color-papaya_orange','color-signal_yellow','color-mustard_yellow','color-desert_sand','color-coffee_brown','color-midnight_purple','color-lavender','color-aubergine')
  AND f.code IN ('gloss','satin','matte');

UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-jet_black-gloss.webp' WHERE id='wrap-jet_black-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-jet_black-satin.webp' WHERE id='wrap-jet_black-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-jet_black-matte.webp' WHERE id='wrap-jet_black-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-alpine_white-gloss.webp' WHERE id='wrap-alpine_white-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-alpine_white-satin.webp' WHERE id='wrap-alpine_white-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-alpine_white-matte.webp' WHERE id='wrap-alpine_white-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-stealth_grey-gloss.webp' WHERE id='wrap-stealth_grey-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-stealth_grey-satin.webp' WHERE id='wrap-stealth_grey-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-stealth_grey-matte.webp' WHERE id='wrap-stealth_grey-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-titanium-gloss.webp' WHERE id='wrap-titanium-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-titanium-satin.webp' WHERE id='wrap-titanium-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-titanium-matte.webp' WHERE id='wrap-titanium-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-deep_navy-gloss.webp' WHERE id='wrap-deep_navy-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-deep_navy-satin.webp' WHERE id='wrap-deep_navy-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-deep_navy-matte.webp' WHERE id='wrap-deep_navy-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-slate_blue-gloss.webp' WHERE id='wrap-slate_blue-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-slate_blue-satin.webp' WHERE id='wrap-slate_blue-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-slate_blue-matte.webp' WHERE id='wrap-slate_blue-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-racing_green-gloss.webp' WHERE id='wrap-racing_green-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-racing_green-satin.webp' WHERE id='wrap-racing_green-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-racing_green-matte.webp' WHERE id='wrap-racing_green-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-emerald-gloss.webp' WHERE id='wrap-emerald-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-emerald-satin.webp' WHERE id='wrap-emerald-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-emerald-matte.webp' WHERE id='wrap-emerald-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ember_red-gloss.webp' WHERE id='wrap-ember_red-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ember_red-satin.webp' WHERE id='wrap-ember_red-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ember_red-matte.webp' WHERE id='wrap-ember_red-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-burgundy-gloss.webp' WHERE id='wrap-burgundy-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-burgundy-satin.webp' WHERE id='wrap-burgundy-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-burgundy-matte.webp' WHERE id='wrap-burgundy-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-sunburst-gloss.webp' WHERE id='wrap-sunburst-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-sunburst-satin.webp' WHERE id='wrap-sunburst-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-sunburst-matte.webp' WHERE id='wrap-sunburst-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-champagne-gloss.webp' WHERE id='wrap-champagne-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-champagne-satin.webp' WHERE id='wrap-champagne-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-champagne-matte.webp' WHERE id='wrap-champagne-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-bronze-gloss.webp' WHERE id='wrap-bronze-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-bronze-satin.webp' WHERE id='wrap-bronze-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-bronze-matte.webp' WHERE id='wrap-bronze-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-plum-gloss.webp' WHERE id='wrap-plum-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-plum-satin.webp' WHERE id='wrap-plum-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-plum-matte.webp' WHERE id='wrap-plum-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ice_silver-gloss.webp' WHERE id='wrap-ice_silver-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ice_silver-satin.webp' WHERE id='wrap-ice_silver-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ice_silver-matte.webp' WHERE id='wrap-ice_silver-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-copper-gloss.webp' WHERE id='wrap-copper-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-copper-satin.webp' WHERE id='wrap-copper-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-copper-matte.webp' WHERE id='wrap-copper-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-onyx_black-gloss.webp' WHERE id='wrap-onyx_black-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-onyx_black-satin.webp' WHERE id='wrap-onyx_black-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-onyx_black-matte.webp' WHERE id='wrap-onyx_black-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-piano_black-gloss.webp' WHERE id='wrap-piano_black-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-piano_black-satin.webp' WHERE id='wrap-piano_black-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-piano_black-matte.webp' WHERE id='wrap-piano_black-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-blue_black-gloss.webp' WHERE id='wrap-blue_black-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-blue_black-satin.webp' WHERE id='wrap-blue_black-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-blue_black-matte.webp' WHERE id='wrap-blue_black-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-pure_white-gloss.webp' WHERE id='wrap-pure_white-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-pure_white-satin.webp' WHERE id='wrap-pure_white-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-pure_white-matte.webp' WHERE id='wrap-pure_white-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ivory_white-gloss.webp' WHERE id='wrap-ivory_white-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ivory_white-satin.webp' WHERE id='wrap-ivory_white-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ivory_white-matte.webp' WHERE id='wrap-ivory_white-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-chalk_white-gloss.webp' WHERE id='wrap-chalk_white-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-chalk_white-satin.webp' WHERE id='wrap-chalk_white-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-chalk_white-matte.webp' WHERE id='wrap-chalk_white-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-concrete_grey-gloss.webp' WHERE id='wrap-concrete_grey-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-concrete_grey-satin.webp' WHERE id='wrap-concrete_grey-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-concrete_grey-matte.webp' WHERE id='wrap-concrete_grey-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-storm_grey-gloss.webp' WHERE id='wrap-storm_grey-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-storm_grey-satin.webp' WHERE id='wrap-storm_grey-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-storm_grey-matte.webp' WHERE id='wrap-storm_grey-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-anthracite-gloss.webp' WHERE id='wrap-anthracite-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-anthracite-satin.webp' WHERE id='wrap-anthracite-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-anthracite-matte.webp' WHERE id='wrap-anthracite-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-battleship_grey-gloss.webp' WHERE id='wrap-battleship_grey-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-battleship_grey-satin.webp' WHERE id='wrap-battleship_grey-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-battleship_grey-matte.webp' WHERE id='wrap-battleship_grey-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-liquid_silver-gloss.webp' WHERE id='wrap-liquid_silver-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-liquid_silver-satin.webp' WHERE id='wrap-liquid_silver-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-liquid_silver-matte.webp' WHERE id='wrap-liquid_silver-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-aluminium-gloss.webp' WHERE id='wrap-aluminium-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-aluminium-satin.webp' WHERE id='wrap-aluminium-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-aluminium-matte.webp' WHERE id='wrap-aluminium-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-cobalt_blue-gloss.webp' WHERE id='wrap-cobalt_blue-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-cobalt_blue-satin.webp' WHERE id='wrap-cobalt_blue-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-cobalt_blue-matte.webp' WHERE id='wrap-cobalt_blue-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-riviera_blue-gloss.webp' WHERE id='wrap-riviera_blue-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-riviera_blue-satin.webp' WHERE id='wrap-riviera_blue-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-riviera_blue-matte.webp' WHERE id='wrap-riviera_blue-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-midnight_blue-gloss.webp' WHERE id='wrap-midnight_blue-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-midnight_blue-satin.webp' WHERE id='wrap-midnight_blue-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-midnight_blue-matte.webp' WHERE id='wrap-midnight_blue-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-petrol_blue-gloss.webp' WHERE id='wrap-petrol_blue-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-petrol_blue-satin.webp' WHERE id='wrap-petrol_blue-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-petrol_blue-matte.webp' WHERE id='wrap-petrol_blue-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-forest_green-gloss.webp' WHERE id='wrap-forest_green-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-forest_green-satin.webp' WHERE id='wrap-forest_green-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-forest_green-matte.webp' WHERE id='wrap-forest_green-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-olive_green-gloss.webp' WHERE id='wrap-olive_green-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-olive_green-satin.webp' WHERE id='wrap-olive_green-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-olive_green-matte.webp' WHERE id='wrap-olive_green-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-khaki_green-gloss.webp' WHERE id='wrap-khaki_green-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-khaki_green-satin.webp' WHERE id='wrap-khaki_green-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-khaki_green-matte.webp' WHERE id='wrap-khaki_green-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-mint_green-gloss.webp' WHERE id='wrap-mint_green-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-mint_green-satin.webp' WHERE id='wrap-mint_green-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-mint_green-matte.webp' WHERE id='wrap-mint_green-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-carmine_red-gloss.webp' WHERE id='wrap-carmine_red-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-carmine_red-satin.webp' WHERE id='wrap-carmine_red-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-carmine_red-matte.webp' WHERE id='wrap-carmine_red-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-rosso_red-gloss.webp' WHERE id='wrap-rosso_red-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-rosso_red-satin.webp' WHERE id='wrap-rosso_red-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-rosso_red-matte.webp' WHERE id='wrap-rosso_red-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-wine_red-gloss.webp' WHERE id='wrap-wine_red-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-wine_red-satin.webp' WHERE id='wrap-wine_red-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-wine_red-matte.webp' WHERE id='wrap-wine_red-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-burnt_orange-gloss.webp' WHERE id='wrap-burnt_orange-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-burnt_orange-satin.webp' WHERE id='wrap-burnt_orange-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-burnt_orange-matte.webp' WHERE id='wrap-burnt_orange-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-papaya_orange-gloss.webp' WHERE id='wrap-papaya_orange-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-papaya_orange-satin.webp' WHERE id='wrap-papaya_orange-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-papaya_orange-matte.webp' WHERE id='wrap-papaya_orange-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-signal_yellow-gloss.webp' WHERE id='wrap-signal_yellow-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-signal_yellow-satin.webp' WHERE id='wrap-signal_yellow-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-signal_yellow-matte.webp' WHERE id='wrap-signal_yellow-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-mustard_yellow-gloss.webp' WHERE id='wrap-mustard_yellow-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-mustard_yellow-satin.webp' WHERE id='wrap-mustard_yellow-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-mustard_yellow-matte.webp' WHERE id='wrap-mustard_yellow-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-desert_sand-gloss.webp' WHERE id='wrap-desert_sand-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-desert_sand-satin.webp' WHERE id='wrap-desert_sand-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-desert_sand-matte.webp' WHERE id='wrap-desert_sand-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-coffee_brown-gloss.webp' WHERE id='wrap-coffee_brown-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-coffee_brown-satin.webp' WHERE id='wrap-coffee_brown-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-coffee_brown-matte.webp' WHERE id='wrap-coffee_brown-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-midnight_purple-gloss.webp' WHERE id='wrap-midnight_purple-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-midnight_purple-satin.webp' WHERE id='wrap-midnight_purple-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-midnight_purple-matte.webp' WHERE id='wrap-midnight_purple-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-lavender-gloss.webp' WHERE id='wrap-lavender-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-lavender-satin.webp' WHERE id='wrap-lavender-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-lavender-matte.webp' WHERE id='wrap-lavender-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-aubergine-gloss.webp' WHERE id='wrap-aubergine-gloss';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-aubergine-satin.webp' WHERE id='wrap-aubergine-satin';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-aubergine-matte.webp' WHERE id='wrap-aubergine-matte';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-deep-navy-metallic.webp' WHERE id='wrap-deep-navy-metallic';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-ice-silver-metallic.webp' WHERE id='wrap-ice-silver-metallic';
UPDATE wrap_options SET preview_asset='/wrap-catalog/wrap-champagne-pearl.webp' WHERE id='wrap-champagne-pearl';
