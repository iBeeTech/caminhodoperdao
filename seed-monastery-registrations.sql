-- Script para adicionar inscrições de teste com pagamento confirmado
-- para testar a organização de quartos do mosteiro

INSERT INTO registrations (
  email, name, status, payment_provider, payment_ref, 
  sleep_at_monastery, phone, companion_name, address, cep, city, state
) VALUES
-- Família Silva - 4 pessoas (São Paulo/SP)
('joao.silva@example.com', 'João Silva', 'PAID', 'mock_pix', 'PIX-silva-001', 1, '(11) 99999-0001', 'Família Silva', 'Rua A, 100', '01310-100', 'São Paulo', 'SP'),
('maria.silva@example.com', 'Maria Silva', 'PAID', 'mock_pix', 'PIX-silva-002', 1, '(11) 99999-0002', 'Família Silva', 'Rua A, 100', '01310-100', 'São Paulo', 'SP'),
('ana.silva@example.com', 'Ana Silva', 'PAID', 'mock_pix', 'PIX-silva-003', 1, '(11) 99999-0007', 'Família Silva', 'Rua A, 100', '01310-100', 'São Paulo', 'SP'),
('lucas.silva@example.com', 'Lucas Silva', 'PAID', 'mock_pix', 'PIX-silva-004', 1, '(11) 99999-0008', 'Família Silva', 'Rua A, 100', '01310-100', 'São Paulo', 'SP'),

-- Grupo Peregrinos do Amor - 5 pessoas (Rio de Janeiro/RJ)
('pedro.santos@example.com', 'Pedro Santos', 'PAID', 'mock_pix', 'PIX-peregrinos-001', 1, '(21) 99999-0003', 'Grupo Peregrinos do Amor', 'Av. Paulista, 1000', '01310-100', 'Rio de Janeiro', 'RJ'),
('ana.costa@example.com', 'Ana Costa', 'PAID', 'mock_pix', 'PIX-peregrinos-002', 1, '(21) 99999-0004', 'Grupo Peregrinos do Amor', 'Av. Paulista, 1000', '01310-100', 'Rio de Janeiro', 'RJ'),
('carlos.oliveira@example.com', 'Carlos Oliveira', 'PAID', 'mock_pix', 'PIX-peregrinos-003', 1, '(21) 99999-0005', 'Grupo Peregrinos do Amor', 'Av. Paulista, 1000', '01310-100', 'Rio de Janeiro', 'RJ'),
('beatriz.ferreira@example.com', 'Beatriz Ferreira', 'PAID', 'mock_pix', 'PIX-peregrinos-004', 1, '(21) 99999-0009', 'Grupo Peregrinos do Amor', 'Av. Paulista, 1000', '01310-100', 'Rio de Janeiro', 'RJ'),
('thiago.mendes@example.com', 'Thiago Mendes', 'PAID', 'mock_pix', 'PIX-peregrinos-005', 1, '(21) 99999-0010', 'Grupo Peregrinos do Amor', 'Av. Paulista, 1000', '01310-100', 'Rio de Janeiro', 'RJ'),

-- Família Santos - 3 pessoas (Fortaleza/CE)
('fulano.santos@example.com', 'Fulano de Tal', 'PAID', 'mock_pix', 'PIX-santos-001', 1, '(85) 99999-0006', 'Família Santos', 'Rua da Paz, 50', '60060-140', 'Fortaleza', 'CE'),
('ciclana.santos@example.com', 'Ciclana dos Santos', 'PAID', 'mock_pix', 'PIX-santos-002', 1, '(85) 99999-0011', 'Família Santos', 'Rua da Paz, 50', '60060-140', 'Fortaleza', 'CE'),
('beltrano.santos@example.com', 'Beltrano Santos', 'PAID', 'mock_pix', 'PIX-santos-003', 1, '(85) 99999-0012', 'Família Santos', 'Rua da Paz, 50', '60060-140', 'Fortaleza', 'CE'),

-- Família Oliveira - 2 pessoas (Belo Horizonte/MG)
('roberto.oliveira@example.com', 'Roberto Oliveira', 'PAID', 'mock_pix', 'PIX-oliveira-001', 1, '(31) 99999-0013', 'Família Oliveira', 'Avenida Getúlio Vargas, 1500', '30130-100', 'Belo Horizonte', 'MG'),
('fernanda.oliveira@example.com', 'Fernanda Oliveira', 'PAID', 'mock_pix', 'PIX-oliveira-002', 1, '(31) 99999-0014', 'Família Oliveira', 'Avenida Getúlio Vargas, 1500', '30130-100', 'Belo Horizonte', 'MG'),

-- Grupo Caminhantes da Fé - 4 pessoas (Florianópolis/SC)
('marcelo.rocha@example.com', 'Marcelo Rocha', 'PAID', 'mock_pix', 'PIX-caminhantes-001', 1, '(48) 99999-0015', 'Grupo Caminhantes da Fé', 'Rua Felipe Schmidt, 1000', '88010-160', 'Florianópolis', 'SC'),
('gabriela.rocha@example.com', 'Gabriela Rocha', 'PAID', 'mock_pix', 'PIX-caminhantes-002', 1, '(48) 99999-0016', 'Grupo Caminhantes da Fé', 'Rua Felipe Schmidt, 1000', '88010-160', 'Florianópolis', 'SC'),
('patricia.lima@example.com', 'Patricia Lima', 'PAID', 'mock_pix', 'PIX-caminhantes-003', 1, '(48) 99999-0017', 'Grupo Caminhantes da Fé', 'Rua Felipe Schmidt, 1000', '88010-160', 'Florianópolis', 'SC'),
('eduardo.costa@example.com', 'Eduardo Costa', 'PAID', 'mock_pix', 'PIX-caminhantes-004', 1, '(48) 99999-0018', 'Grupo Caminhantes da Fé', 'Rua Felipe Schmidt, 1000', '88010-160', 'Florianópolis', 'SC'),

-- Sem Grupo - 2 pessoas (Salvador/BA)
('joana.pereira@example.com', 'Joana Pereira', 'PAID', 'mock_pix', 'PIX-salvador-001', 1, '(71) 99999-0019', NULL, 'Avenida Sete de Setembro, 1000', '40080-140', 'Salvador', 'BA'),
('victor.alves@example.com', 'Victor Alves', 'PAID', 'mock_pix', 'PIX-salvador-002', 1, '(71) 99999-0020', NULL, 'Avenida Sete de Setembro, 1000', '40080-140', 'Salvador', 'BA');
