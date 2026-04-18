const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SMARTFLEET API',
      version: '1.0.0',
      description: 'API do sistema de Gestão de Frotas SMARTFLEET — Controle, Monitoramento, Diagnóstico e Análise',
    },
    servers: [{ url: '/api', description: 'API Server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Login: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@smartfleet.com' },
            password: { type: 'string', example: 'admin123' },
          },
        },
        Register: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'João Silva' },
            email: { type: 'string', example: 'joao@smartfleet.com' },
            password: { type: 'string', example: 'senha123' },
            role: { type: 'string', enum: ['admin', 'operator'], example: 'operator' },
          },
        },
        Vehicle: {
          type: 'object',
          required: ['plate'],
          properties: {
            plate: { type: 'string', example: 'ABC-1234' },
            brand: { type: 'string', example: 'Toyota' },
            model: { type: 'string', example: 'Hilux' },
            year: { type: 'integer', example: 2024 },
            color: { type: 'string', example: 'Branco' },
            fuel_type: { type: 'string', enum: ['flex', 'gasoline', 'ethanol', 'diesel', 'electric'], example: 'flex' },
            mileage: { type: 'number', example: 15000 },
            status: { type: 'string', enum: ['available', 'in_use', 'maintenance', 'inactive'], example: 'available' },
          },
        },
        Driver: {
          type: 'object',
          required: ['name', 'cnh', 'cnh_expiry'],
          properties: {
            name: { type: 'string', example: 'Carlos Oliveira' },
            cnh: { type: 'string', example: '12345678900' },
            cnh_category: { type: 'string', enum: ['A', 'B', 'AB', 'C', 'D', 'E'], example: 'B' },
            cnh_expiry: { type: 'string', format: 'date', example: '2027-06-15' },
            phone: { type: 'string', example: '(11) 99999-0000' },
            email: { type: 'string', example: 'carlos@email.com' },
            status: { type: 'string', enum: ['available', 'on_trip', 'inactive'], example: 'available' },
          },
        },
        Trip: {
          type: 'object',
          required: ['vehicle_id', 'driver_id', 'origin', 'destination', 'departure_date', 'initial_mileage'],
          properties: {
            vehicle_id: { type: 'integer', example: 1 },
            driver_id: { type: 'integer', example: 1 },
            origin: { type: 'string', example: 'São Paulo' },
            destination: { type: 'string', example: 'Campinas' },
            departure_date: { type: 'string', format: 'date', example: '2026-03-15' },
            initial_mileage: { type: 'number', example: 15000 },
            purpose: { type: 'string', example: 'Entrega de materiais' },
            observations: { type: 'string', example: 'Viagem urgente' },
          },
        },
        TripComplete: {
          type: 'object',
          required: ['final_mileage'],
          properties: {
            final_mileage: { type: 'number', example: 15120 },
            return_date: { type: 'string', format: 'date', example: '2026-03-16' },
            observations: { type: 'string', example: 'Viagem concluída sem problemas' },
          },
        },
        Maintenance: {
          type: 'object',
          required: ['vehicle_id', 'type', 'description', 'scheduled_date'],
          properties: {
            vehicle_id: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['preventive', 'corrective', 'inspection'], example: 'preventive' },
            description: { type: 'string', example: 'Troca de óleo e filtros' },
            scheduled_date: { type: 'string', format: 'date', example: '2026-03-20' },
            cost: { type: 'number', example: 350.00 },
            mileage_at_service: { type: 'number', example: 15000 },
            provider: { type: 'string', example: 'Oficina Centro' },
          },
        },
        FuelRecord: {
          type: 'object',
          required: ['vehicle_id', 'fuel_type', 'liters', 'cost_per_liter', 'mileage'],
          properties: {
            vehicle_id: { type: 'integer', example: 1 },
            driver_id: { type: 'integer', example: 1 },
            date: { type: 'string', format: 'date', example: '2026-03-13' },
            fuel_type: { type: 'string', enum: ['gasoline', 'ethanol', 'diesel'], example: 'gasoline' },
            liters: { type: 'number', example: 45.5 },
            cost_per_liter: { type: 'number', example: 5.89 },
            mileage: { type: 'number', example: 15000 },
            gas_station: { type: 'string', example: 'Posto Shell Centro' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      // ========== AUTH ==========
      '/auth/login': {
        post: {
          tags: ['Autenticação'],
          summary: 'Fazer login',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } },
          responses: {
            200: { description: 'Login bem-sucedido, retorna token JWT e dados do usuário' },
            401: { description: 'Credenciais inválidas' },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Autenticação'],
          summary: 'Registrar novo usuário (apenas admin)',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Register' } } } },
          responses: {
            201: { description: 'Usuário criado' },
            400: { description: 'Dados inválidos ou email já cadastrado' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Autenticação'],
          summary: 'Dados do usuário logado',
          responses: { 200: { description: 'Dados do usuário autenticado' } },
        },
      },
      '/auth/users': {
        get: {
          tags: ['Autenticação'],
          summary: 'Listar todos os usuários (apenas admin)',
          responses: { 200: { description: 'Lista de usuários' } },
        },
      },

      // ========== VEHICLES ==========
      '/vehicles': {
        get: {
          tags: ['Veículos'],
          summary: 'Listar veículos',
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['available', 'in_use', 'maintenance', 'inactive'] }, description: 'Filtrar por status' },
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Buscar por placa, marca ou modelo' },
          ],
          responses: { 200: { description: 'Lista de veículos' } },
        },
        post: {
          tags: ['Veículos'],
          summary: 'Cadastrar veículo',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Vehicle' } } } },
          responses: {
            201: { description: 'Veículo criado' },
            400: { description: 'Placa já cadastrada ou dados inválidos' },
          },
        },
      },
      '/vehicles/{id}': {
        get: {
          tags: ['Veículos'],
          summary: 'Buscar veículo por ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Dados do veículo' },
            404: { description: 'Veículo não encontrado' },
          },
        },
        put: {
          tags: ['Veículos'],
          summary: 'Atualizar veículo',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Vehicle' } } } },
          responses: {
            200: { description: 'Veículo atualizado' },
            404: { description: 'Veículo não encontrado' },
          },
        },
        delete: {
          tags: ['Veículos'],
          summary: 'Excluir veículo',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Veículo excluído' },
            404: { description: 'Veículo não encontrado' },
          },
        },
      },

      // ========== DRIVERS ==========
      '/drivers': {
        get: {
          tags: ['Motoristas'],
          summary: 'Listar motoristas',
          responses: { 200: { description: 'Lista de motoristas' } },
        },
        post: {
          tags: ['Motoristas'],
          summary: 'Cadastrar motorista',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Driver' } } } },
          responses: {
            201: { description: 'Motorista criado' },
            400: { description: 'CNH já cadastrada ou dados inválidos' },
          },
        },
      },
      '/drivers/{id}': {
        get: {
          tags: ['Motoristas'],
          summary: 'Buscar motorista por ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Dados do motorista' }, 404: { description: 'Não encontrado' } },
        },
        put: {
          tags: ['Motoristas'],
          summary: 'Atualizar motorista',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Driver' } } } },
          responses: { 200: { description: 'Motorista atualizado' }, 404: { description: 'Não encontrado' } },
        },
        delete: {
          tags: ['Motoristas'],
          summary: 'Excluir motorista',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Motorista excluído' }, 404: { description: 'Não encontrado' } },
        },
      },

      // ========== TRIPS ==========
      '/trips': {
        get: {
          tags: ['Viagens'],
          summary: 'Listar viagens',
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] } },
            { in: 'query', name: 'vehicle_id', schema: { type: 'integer' } },
            { in: 'query', name: 'driver_id', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Lista de viagens' } },
        },
        post: {
          tags: ['Viagens'],
          summary: 'Criar viagem',
          description: 'Cria uma nova viagem com status "scheduled". Veículo e motorista precisam estar disponíveis.',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Trip' } } } },
          responses: {
            201: { description: 'Viagem criada' },
            400: { description: 'Veículo/motorista não disponível ou dados inválidos' },
          },
        },
      },
      '/trips/{id}': {
        get: {
          tags: ['Viagens'],
          summary: 'Buscar viagem por ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Dados da viagem' }, 404: { description: 'Não encontrada' } },
        },
        delete: {
          tags: ['Viagens'],
          summary: 'Excluir viagem',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Viagem excluída' }, 404: { description: 'Não encontrada' } },
        },
      },
      '/trips/{id}/start': {
        patch: {
          tags: ['Viagens'],
          summary: 'Iniciar viagem',
          description: 'Muda status da viagem para "in_progress". Veículo muda para "in_use" e motorista para "on_trip".',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Viagem iniciada' },
            400: { description: 'Viagem não pode ser iniciada (status inválido)' },
          },
        },
      },
      '/trips/{id}/complete': {
        patch: {
          tags: ['Viagens'],
          summary: 'Concluir viagem',
          description: 'Finaliza a viagem. Veículo e motorista voltam para "available". Km do veículo é atualizado.',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TripComplete' } } } },
          responses: {
            200: { description: 'Viagem concluída' },
            400: { description: 'Viagem não está em andamento ou km final ausente' },
          },
        },
      },
      '/trips/{id}/cancel': {
        patch: {
          tags: ['Viagens'],
          summary: 'Cancelar viagem',
          description: 'Cancela a viagem. Se estava em andamento, libera veículo e motorista.',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Viagem cancelada' },
            400: { description: 'Viagem já concluída' },
          },
        },
      },

      // ========== MAINTENANCE ==========
      '/maintenance': {
        get: {
          tags: ['Manutenções'],
          summary: 'Listar manutenções',
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['scheduled', 'in_progress', 'completed'] } },
            { in: 'query', name: 'vehicle_id', schema: { type: 'integer' } },
            { in: 'query', name: 'type', schema: { type: 'string', enum: ['preventive', 'corrective', 'inspection'] } },
          ],
          responses: { 200: { description: 'Lista de manutenções' } },
        },
        post: {
          tags: ['Manutenções'],
          summary: 'Agendar manutenção',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Maintenance' } } } },
          responses: { 201: { description: 'Manutenção criada' }, 400: { description: 'Dados inválidos' } },
        },
      },
      '/maintenance/{id}': {
        get: {
          tags: ['Manutenções'],
          summary: 'Buscar manutenção por ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Dados da manutenção' }, 404: { description: 'Não encontrada' } },
        },
        put: {
          tags: ['Manutenções'],
          summary: 'Atualizar manutenção',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Maintenance' } } } },
          responses: { 200: { description: 'Manutenção atualizada' }, 404: { description: 'Não encontrada' } },
        },
        delete: {
          tags: ['Manutenções'],
          summary: 'Excluir manutenção',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Manutenção excluída' }, 404: { description: 'Não encontrada' } },
        },
      },
      '/maintenance/{id}/start': {
        patch: {
          tags: ['Manutenções'],
          summary: 'Iniciar manutenção',
          description: 'Veículo muda para status "maintenance".',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Manutenção iniciada' }, 400: { description: 'Status inválido' } },
        },
      },
      '/maintenance/{id}/complete': {
        patch: {
          tags: ['Manutenções'],
          summary: 'Concluir manutenção',
          description: 'Veículo volta para "available".',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cost: { type: 'number', example: 450.00 },
                    completed_date: { type: 'string', format: 'date', example: '2026-03-13' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Manutenção concluída' }, 400: { description: 'Status inválido' } },
        },
      },

      // ========== FUEL ==========
      '/fuel': {
        get: {
          tags: ['Combustível'],
          summary: 'Listar registros de abastecimento',
          parameters: [{ in: 'query', name: 'vehicle_id', schema: { type: 'integer' }, description: 'Filtrar por veículo' }],
          responses: { 200: { description: 'Lista de abastecimentos' } },
        },
        post: {
          tags: ['Combustível'],
          summary: 'Registrar abastecimento',
          description: 'O custo total é calculado automaticamente (litros × valor por litro).',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FuelRecord' } } } },
          responses: { 201: { description: 'Abastecimento registrado' }, 400: { description: 'Dados inválidos' } },
        },
      },
      '/fuel/{id}': {
        delete: {
          tags: ['Combustível'],
          summary: 'Excluir registro de abastecimento',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Registro excluído' }, 404: { description: 'Não encontrado' } },
        },
      },

      // ========== REPORTS ==========
      '/reports/dashboard': {
        get: {
          tags: ['Relatórios'],
          summary: 'Estatísticas do dashboard',
          description: 'Retorna contadores de veículos, motoristas, viagens, manutenções, viagens recentes, próximas manutenções e custos de combustível.',
          responses: { 200: { description: 'Dados do dashboard' } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
