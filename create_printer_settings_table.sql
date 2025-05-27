-- Create printer_settings table
CREATE TABLE IF NOT EXISTS printer_settings (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  printer_type VARCHAR(50) DEFAULT 'thermal',
  printer_ip VARCHAR(100),
  printer_port INTEGER DEFAULT 9100,
  printer_name VARCHAR(255),
  is_network_printer BOOLEAN DEFAULT true,
  header_text TEXT,
  footer_text TEXT,
  address TEXT,
  phone VARCHAR(50),
  logo_url TEXT,
  print_copies INTEGER DEFAULT 1,
  auto_print BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_printer_settings_username ON printer_settings(username);

-- Add comments for better documentation
COMMENT ON TABLE printer_settings IS 'Stores thermal printer settings for each vendor';
COMMENT ON COLUMN printer_settings.username IS 'Username of the vendor (matches the username in orders table)';
COMMENT ON COLUMN printer_settings.printer_type IS 'Type of printer (thermal, laser, etc.)';
COMMENT ON COLUMN printer_settings.printer_ip IS 'IP address for network printers';
COMMENT ON COLUMN printer_settings.printer_port IS 'Network port for the printer (usually 9100)';
COMMENT ON COLUMN printer_settings.printer_name IS 'Friendly name of the printer';
COMMENT ON COLUMN printer_settings.is_network_printer IS 'Whether this is a network printer or local USB printer';
COMMENT ON COLUMN printer_settings.header_text IS 'Text to print at the top of receipts';
COMMENT ON COLUMN printer_settings.footer_text IS 'Text to print at the bottom of receipts';
COMMENT ON COLUMN printer_settings.print_copies IS 'Number of receipt copies to print';
COMMENT ON COLUMN printer_settings.auto_print IS 'Whether to automatically print when order is created';