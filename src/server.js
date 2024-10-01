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
const validStoneCodes = ['206192723']; // Adicione seus Stone Codes válidos aqui


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
  connectString: '18.230.186.194:1521/XE'
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
      case '206192723':
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

// Iniciar o servidor HTTPS na porta 443
https.createServer(options, app).listen(443, () => {
  console.log(`Servidor rodando com HTTPS na porta 443`);
});
