-- Envío en tanda por WhatsApp: cuándo se le mandó la invitación y el último recordatorio
ALTER TABLE invitados ADD COLUMN enviado TEXT;
ALTER TABLE invitados ADD COLUMN recordado TEXT;
