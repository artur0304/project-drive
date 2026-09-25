-- These two Commons source pages identify the brand and event, but do not name
-- a retail model. Label them as exhibition references instead of guessing one.
UPDATE wheel_models SET name = 'Top Marques 2019 exhibit'
WHERE id = 'model-commons-brabus-monoblock';

UPDATE wheel_models SET name = 'Tuning World exhibit'
WHERE id = 'model-commons-borbet-tuning-world';
