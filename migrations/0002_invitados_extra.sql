-- Lista de invitados: familias, teléfono, aperturas del link y llegada al evento
ALTER TABLE invitados ADD COLUMN integrantes TEXT;   -- "Juan, María, Tomás" (link por familia); vacío = una persona
ALTER TABLE invitados ADD COLUMN telefono TEXT;      -- para mandar el WhatsApp directo a su número
ALTER TABLE invitados ADD COLUMN abierto TEXT;       -- primera vez que abrió su link
ALTER TABLE invitados ADD COLUMN ultima TEXT;        -- última vez
ALTER TABLE invitados ADD COLUMN visitas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invitados ADD COLUMN llego TEXT;         -- llegada al evento (check-in en la puerta)
ALTER TABLE invitados ADD COLUMN llegaron INTEGER;   -- cuántas personas de su grupo entraron
