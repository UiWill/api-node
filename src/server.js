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

function validarCPF(cpf) {
  if (cpf === "00000000000" || cpf === "11111111111" || cpf === "22222222222" ||
      cpf === "33333333333" || cpf === "44444444444" || cpf === "55555555555" ||
      cpf === "66666666666" || cpf === "77777777777" || cpf === "88888888888" ||
      cpf === "99999999999" || cpf.length !== 11) {
      return false;
  }

  let soma = 0;
  let resto;
  for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;

  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;

  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

function validarCNPJ(cnpj) {
  if (cnpj === "00000000000000" || cnpj === "11111111111111" || cnpj === "22222222222222" ||
      cnpj === "33333333333333" || cnpj === "44444444444444" || cnpj === "55555555555555" ||
      cnpj === "66666666666666" || cnpj === "77777777777777" || cnpj === "88888888888888" ||
      cnpj === "99999999999999" || cnpj.length !== 14) {
      return false;
  }

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

app.post('/nfc-e-solicitar', async (req, res) => {
  const { stoneCode, cpfCnpj, valor } = req.body;

  let connection;

  try {
      console.log('Recebido POST /nfc-e-solicitar com dados:', req.body);

      // Validação básica dos campos obrigatórios
      if (!stoneCode || !valor) {
          return res.status(400).json({ error: 'Stone Code e Valor são obrigatórios.' });
      }

      // Validação de CPF ou CNPJ
      if (cpfCnpj) {
          if (cpfCnpj.length === 11) {
              if (!validarCPF(cpfCnpj)) {
                  return res.status(400).json({ error: 'CPF inválido.' });
              }
          } else if (cpfCnpj.length === 14) {
              if (!validarCNPJ(cpfCnpj)) {
                  return res.status(400).json({ error: 'CNPJ inválido.' });
              }
          } else {
              return res.status(400).json({ error: 'CPF/CNPJ inválido. Tamanho incorreto.' });
          }
      }

      connection = await oracledb.getConnection(dbConfig);
      console.log('Conexão com o banco de dados estabelecida com sucesso.');

      // SQL para inserção na tabela NFC_SOLICITANTE_DNOTAS
      const sqlInsert = `
          INSERT INTO NFC_SOLICITANTE_DNOTAS (STONECODE, CPF_CNPJ, VALOR)
          VALUES (:stoneCode, :cpfCnpj, :valor)
      `;

      const binds = {
          stoneCode: stoneCode,
          cpfCnpj: cpfCnpj || null,
          valor: parseFloat(valor)
      };

      const options = { autoCommit: true };

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
