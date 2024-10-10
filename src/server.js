const express = require('express');
const bodyParser = require('body-parser');
const oracledb = require('oracledb');
const os = require('os');
const fs = require('fs');
const https = require('https');

const app = express();

// Configuração dos caminhos para os arquivos de certificado SSL
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/api.dnotas.com.br/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/api.dnotas.com.br/fullchain.pem')
};

app.use(bodyParser.json());

// Lista de Stone Codes válidos
// Lista de Stone Codes válidos
const validStoneCodes = ['206192723', '725186995']; // Adicione seus Stone Codes válidos aqui

// Função para validar CPF (com algoritmo completo)
function ValidacaoCPF(CPF) {
  if (CPF === "00000000000" || CPF === "11111111111" || CPF === "22222222222" ||
      CPF === "33333333333" || CPF === "44444444444" || CPF === "55555555555" ||
      CPF === "66666666666" || CPF === "77777777777" || CPF === "88888888888" ||
      CPF === "99999999999" || CPF.length !== 11) {
    return false;
  }
  let dig10, dig11, sm, i, r, num, peso;
  try {
    sm = 0;
    peso = 10;
    for (i = 0; i < 9; i++) {
      num = parseInt(CPF.charAt(i), 10);
      sm += num * peso;
      peso--;
    }
    r = 11 - (sm % 11);
    dig10 = (r === 10 || r === 11) ? '0' : String.fromCharCode(r + 48);

    sm = 0;
    peso = 11;
    for (i = 0; i < 10; i++) {
      num = parseInt(CPF.charAt(i), 10);
      sm += num * peso;
      peso--;
    }
    r = 11 - (sm % 11);
    dig11 = (r === 10 || r === 11) ? '0' : String.fromCharCode(r + 48);

    return (dig10 === CPF.charAt(9)) && (dig11 === CPF.charAt(10));
  } catch (error) {
    return false;
  }
}

// Função para validar CNPJ (com algoritmo completo)
function ValidacaoCNPJ(CNPJ) {
  if (CNPJ === "00000000000000" || CNPJ === "11111111111111" ||
      CNPJ === "22222222222222" || CNPJ === "33333333333333" ||
      CNPJ === "44444444444444" || CNPJ === "55555555555555" ||
      CNPJ === "66666666666666" || CNPJ === "77777777777777" ||
      CNPJ === "88888888888888" || CNPJ === "99999999999999" || CNPJ.length !== 14) {
    return false;
  }
  let dig13, dig14, sm, i, r, num, peso;
  try {
    sm = 0;
    peso = 2;
    for (i = 11; i >= 0; i--) {
      num = parseInt(CNPJ.charAt(i), 10);
      sm += num * peso;
      peso = (peso === 9) ? 2 : peso + 1;
    }
    r = sm % 11;
    dig13 = (r === 0 || r === 1) ? '0' : String.fromCharCode((11 - r) + 48);

    sm = 0;
    peso = 2;
    for (i = 12; i >= 0; i--) {
      num = parseInt(CNPJ.charAt(i), 10);
      sm += num * peso;
      peso = (peso === 9) ? 2 : peso + 1;
    }
    r = sm % 11;
    dig14 = (r === 0 || r === 1) ? '0' : String.fromCharCode((11 - r) + 48);

    return (dig13 === CNPJ.charAt(12)) && (dig14 === CNPJ.charAt(13));
  } catch (error) {
    return false;
  }
}

// Função para limpar CPF/CNPJ (remover caracteres especiais)
function cleanCpfCnpj(value) {
  return value.replace(/\D/g, ''); // Remove tudo que não for número
}

// Função para verificar se é CPF ou CNPJ
function isCpfOrCnpj(value) {
  const cleanValue = cleanCpfCnpj(value);
  if (cleanValue.length === 11) {
    return 'CPF';
  } else if (cleanValue.length === 14) {
    return 'CNPJ';
  }
  return null; // Caso o valor não seja nem CPF nem CNPJ
}



// Endpoint para validar o Stone Code
app.post('/validate-stone-code', (req, res) => {
  const { stoneCode } = req.body;

  // Verificar se o Stone Code está na lista de válidos
  if (validStoneCodes.includes(stoneCode)) {
    res.status(200).json({ message: 'Stone Code válido.' });
  } else {
    res.status(404).json({ message: 'Stone Code inválido.' });
  }
});  


// Obter o caminho do Oracle Instant Client com base no sistema operacional
let libDir = '';
if (os.platform() === 'win32') {
  libDir = 'C:\\instantclient_21_13';
} else if (os.platform() === 'linux') {
  libDir = '/opt/oracle/instantclient_21_14';
} else {
  console.error('Sistema operacional não suportado');
  process.exit(1);
}

// Inicializar o cliente Oracle
oracledb.initOracleClient({ libDir });

// Configuração do banco de dados
const dbConfig = {
  user: 'CLIENTES_CNPJ_NOVO',
  password: 'D_d2017',
  connectString: '18.228.36.189:1521/XE'
};

// Rota para o SELECT
app.get("/", (req, res) => {
  res.send("salve Alek");
});

// Rota para o INSERT (renomeada para /tosend)
app.post('/tosend', async (req, res) => {
  const { valor1, valor2, valor3, valor4, valor5, valor6, valor7, valor8, stoneCode, authorizationCode  } = req.body;

  let connection;

  try {
    console.log('Recebido POST /tosend com dados:', req.body);

    connection = await oracledb.getConnection(dbConfig);
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Verificar e converter valores numéricos
    const id = parseInt(valor1, 10);
    const valor = parseFloat(valor5);

    console.log(`ID convertido: ${id}`);
    console.log(`VALOR convertido: ${valor}`);
    console.log(`Stone Code: ${stoneCode}`);

    let sqlInsert = '';
    let binds = {};

    // Verificar qual tabela será usada com base no stone code
    switch(stoneCode) {
      case '725186995':
        sqlInsert = `INSERT INTO PEDIDO_PAG_SIMPLES (ID, MODOPAGAMENTO, PARCELAS, DATAFULL, VALOR, CAUT_YA07, TBAND_YA06, CNPJ_YA05, STONE_CODE, STONE_ID ) 
                     VALUES (:id, :modopagamento, :parcelas, :datafull, :valor, :caut_ya07, :tband_ya06, :cnpj_ya05, :STONE_CODE, :AUT)`;
        binds = { 
          id: id, 
          modopagamento: valor2, 
          parcelas: valor3, 
          datafull: valor4, 
          valor: valor, 
          caut_ya07: valor6, 
          tband_ya06: valor7, 
          cnpj_ya05: valor8,
          STONE_CODE: stoneCode,
          AUT: authorizationCode
        };
        break;
      
      // Adicionar outros "stone codes" e tabelas aqui
      case '123456789': // Exemplo de outro stone code
        sqlInsert = `INSERT INTO OUTRA_TABELA (ID, MODOPAGAMENTO, PARCELAS, DATAFULL, VALOR, OUTROCAMPO, MAISUMCAMPO, CNPJ) 
                     VALUES (:id, :modopagamento, :parcelas, :datafull, :valor, :outrocampo, :maisumcampo, :cnpj)`;
        binds = { 
          id: id, 
          modopagamento: valor2, 
          parcelas: valor3, 
          datafull: valor4, 
          valor: valor, 
          outrocampo: valor6, 
          maisumcampo: valor7, 
          cnpj: valor8,
          STONE_CODE: stoneCode,
          AUT: authorizationCode
        };
        break;

      // Padrão para tratar stone codes não mapeados
      default:
        return res.status(400).json({ error: 'Stone code não mapeado.' });
    }

    // Executar a inserção na tabela selecionada
    const options = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };

    console.log(`Executando inserção na tabela com stone code ${stoneCode}:`, binds);
    await connection.execute(sqlInsert, binds, options);
    console.log(`Inserção realizada com sucesso na tabela correspondente ao stone code ${stoneCode}.`);

    // Commit a transação
    await connection.commit();
    console.log('Transação commitada com sucesso.');

    await connection.close();
    console.log('Conexão com o banco de dados fechada com sucesso.');

    res.status(201).json({ message: 'Inserção realizada com sucesso.' });
  } catch (err) {
    console.error('Erro durante a execução:', err);

    if (connection) {
      try {
        await connection.rollback();
        console.log('Transação revertida com sucesso.');
      } catch (rollbackErr) {
        console.error('Erro durante o rollback:', rollbackErr);
      }
    }

    res.status(500).json({ error: err.message });
  }
});

app.post('/nfc-e-solicitar', async (req, res) => {
  const { stoneCode, cpfCnpj, valor } = req.body;

  let connection;

  // Função para limpar CPF/CNPJ (remover caracteres especiais)
  function cleanCpfCnpj(value) {
    return value.replace(/\D/g, ''); // Remove tudo que não for número
  }

  // Função para verificar se é CPF ou CNPJ
  function isCpfOrCnpj(value) {
    const cleanValue = cleanCpfCnpj(value);
    if (cleanValue.length === 11) {
      return 'CPF';
    } else if (cleanValue.length === 14) {
      return 'CNPJ';
    }
    return null; // Caso o valor não seja nem CPF nem CNPJ
  }

  // Função para validar CPF (algoritmo simplificado)
  function isValidCpf(cpf) {
    const cleanCpf = cleanCpfCnpj(cpf);
    if (cleanCpf.length !== 11) return false;
    
    // Adicione o algoritmo de validação de CPF aqui
    return true; // Retorne true se for válido
  }

  // Função para validar CNPJ (algoritmo simplificado)
  function isValidCnpj(cnpj) {
    const cleanCnpj = cleanCpfCnpj(cnpj);
    if (cleanCnpj.length !== 14) return false;

    // Adicione o algoritmo de validação de CNPJ aqui
    return true; // Retorne true se for válido
  }

  try {
    console.log('Recebido POST /nfc-e-solicitar com dados:', req.body);

    // Validação básica dos campos obrigatórios
    if (!stoneCode || !valor) {
      return res.status(400).json({ error: 'Stone Code e Valor são obrigatórios.' });
    }

    // Verificar CPF/CNPJ
    const documentoTipo = isCpfOrCnpj(cpfCnpj);
    if (!documentoTipo) {
      return res.status(400).json({ error: 'CPF/CNPJ inválido.' });
    }

    // Validar CPF ou CNPJ
    let isValidDocument = false;
    if (documentoTipo === 'CPF') {
      isValidDocument = isValidCpf(cpfCnpj);
    } else if (documentoTipo === 'CNPJ') {
      isValidDocument = isValidCnpj(cpfCnpj);
    }

    if (!isValidDocument) {
      return res.status(400).json({ error: `${documentoTipo} inválido.` });
    }

    connection = await oracledb.getConnection(dbConfig);
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // SQL para inserção na tabela NFC_SOLICITANTE_DNOTAS
    const sqlInsert = `
      INSERT INTO NFC_SOLICITANTE_DNOTAS (STONECODE, CPF_CNPJ, VALOR)
      VALUES (:stoneCode, :cpfCnpj, :valor)
    `;

    // Bind dos valores recebidos
    const binds = {
      stoneCode: stoneCode,
      cpfCnpj: cpfCnpj || null, // Se CPF/CNPJ não for enviado, insere null
      valor: parseFloat(valor)   // Converter valor para número decimal
    };

    const options = { autoCommit: true }; // Auto-commit da transação

    // Executar a inserção
    await connection.execute(sqlInsert, binds, options);
    console.log('Inserção realizada com sucesso na tabela NFC_SOLICITANTE_DNOTAS.');

    await connection.close();
    console.log('Conexão com o banco de dados fechada com sucesso.');

    res.status(201).json({ message: 'Solicitação de NFC-e realizada com sucesso.' });
  } catch (err) {
    console.error('Erro durante a execução:', err);

    if (connection) {
      try {
        await connection.rollback();
        console.log('Transação revertida com sucesso.');
      } catch (rollbackErr) {
        console.error('Erro durante o rollback:', rollbackErr);
      }
    }

    res.status(500).json({ error: err.message });
  }
});



// Iniciar o servidor HTTPS na porta 443
https.createServer(options, app).listen(443, () => {
  console.log(`Servidor rodando com HTTPS na porta 443`);
});
