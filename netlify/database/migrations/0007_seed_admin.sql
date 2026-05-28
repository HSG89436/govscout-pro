-- Ensure the site owner always has admin access
-- Safe to run multiple times (ON CONFLICT DO UPDATE)
INSERT INTO users (email, subscription_status, role)
VALUES ('sharriman2002@gmail.com', 'active', 'admin')
ON CONFLICT (email) DO UPDATE
  SET role = 'admin',
      subscription_status = 'active';
