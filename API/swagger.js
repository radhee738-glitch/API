const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Banking API',
    version: '1.0.0',
    description: 'A secure banking API with account management, transactions, loans, tickets, and admin features.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      AuthRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'admin', 'teller', 'security'] },
          cnic: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          dob: { type: 'string', format: 'date' }
        },
        required: ['email', 'password']
      },
      AccountOpenRequest: {
        type: 'object',
        properties: {
          customerId: { type: 'integer' },
          type: { type: 'string', example: 'savings' },
          currency: { type: 'string', example: 'PKR' },
          openingBalance: { type: 'number', format: 'float' }
        },
        required: ['customerId']
      },
      TransferRequest: {
        type: 'object',
        properties: {
          fromAccount: { type: 'string' },
          toAccount: { type: 'string' },
          amount: { type: 'number', format: 'float' },
          counterId: { type: 'integer' },
          ticketNumber: { type: 'integer' },
          description: { type: 'string' }
        },
        required: ['fromAccount', 'toAccount', 'amount']
      },
      TransactionRequest: {
        type: 'object',
        properties: {
          accountNumber: { type: 'string' },
          amount: { type: 'number', format: 'float' },
          counterId: { type: 'integer' },
          ticketNumber: { type: 'integer' },
          description: { type: 'string' }
        },
        required: ['accountNumber', 'amount']
      },
      LoanRequest: {
        type: 'object',
        properties: {
          accountNumber: { type: 'string' },
          amount: { type: 'number', format: 'float' },
          termMonths: { type: 'integer' },
          creditScore: { type: 'integer' }
        },
        required: ['accountNumber', 'amount', 'termMonths']
      },
      TicketRequest: {
        type: 'object',
        properties: {
          counterId: { type: 'integer' }
        },
        required: ['counterId']
      },
      SecurityStaffRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          cnic: { type: 'string' },
          phone: { type: 'string' },
          shift: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['name', 'cnic']
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'User registered' },
          '400': { description: 'Missing required fields' },
          '409': { description: 'Email or CNIC already exists' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login and receive a JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Token issued' },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/api/accounts/open': {
      post: {
        tags: ['Accounts'],
        summary: 'Open a new account for a customer',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AccountOpenRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Account opened' },
          '400': { description: 'Validation error' },
          '401': { description: 'Authentication required' }
        }
      }
    },
    '/api/accounts/mine': {
      get: {
        tags: ['Accounts'],
        summary: 'Get accounts for the logged-in customer',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Accounts returned' },
          '401': { description: 'Authentication required' }
        }
      }
    },
    '/api/accounts/{accountNumber}': {
      get: {
        tags: ['Accounts'],
        summary: 'Get details for a specific account',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'accountNumber',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Account returned' },
          '403': { description: 'Access denied' },
          '404': { description: 'Account not found' }
        }
      }
    },
    '/api/transactions/transfer': {
      post: {
        tags: ['Transactions'],
        summary: 'Transfer funds between accounts',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransferRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'Transfer completed' },
          '400': { description: 'Validation error or insufficient funds' }
        }
      }
    },
    '/api/transactions/deposit': {
      post: {
        tags: ['Transactions'],
        summary: 'Deposit funds into an account',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransactionRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'Deposit successful' }
        }
      }
    },
    '/api/transactions/withdraw': {
      post: {
        tags: ['Transactions'],
        summary: 'Withdraw funds from an account',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransactionRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'Withdrawal successful' },
          '400': { description: 'Insufficient funds or validation error' }
        }
      }
    },
    '/api/transactions/history/{accountNumber}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get transaction history for an account',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'accountNumber',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Transaction history returned' }
        }
      }
    },
    '/api/loans/apply': {
      post: {
        tags: ['Loans'],
        summary: 'Apply for a loan',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoanRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Loan application created' }
        }
      }
    },
    '/api/loans/approve/{loanId}': {
      put: {
        tags: ['Loans'],
        summary: 'Approve a loan application',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'loanId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': { description: 'Loan approved' }
        }
      }
    },
    '/api/loans/status': {
      get: {
        tags: ['Loans'],
        summary: 'Get loan status for the caller',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Loan status returned' }
        }
      }
    },
    '/api/tickets/counters': {
      get: {
        tags: ['Tickets'],
        summary: 'Get available counters',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Counters returned' }
        }
      }
    },
    '/api/tickets/request': {
      post: {
        tags: ['Tickets'],
        summary: 'Request a ticket for a counter',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TicketRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Ticket created' }
        }
      }
    },
    '/api/tickets/{ticketId}/call': {
      post: {
        tags: ['Tickets'],
        summary: 'Call a ticket at a counter',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'ticketId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': { description: 'Ticket called' }
        }
      }
    },
    '/api/security/staff': {
      post: {
        tags: ['Security'],
        summary: 'Create a security staff record',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SecurityStaffRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Security staff created' }
        }
      },
      get: {
        tags: ['Security'],
        summary: 'List security staff records',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Security staff list returned' }
        }
      }
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Get admin dashboard metrics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Dashboard summary returned' }
        }
      }
    }
  }
};

module.exports = swaggerSpec;
