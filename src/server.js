const express = require('express');
const bodyParser = require('body-parser');
const oracledb = require('oracledb');
const os = require('os');

const app = express();
const port = 3333;

app.use(bodyParser.json());

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

// Rota para o INSERT
app.post('/notasteste2', async (req, res) => {
  const { valor1, valor2, valor3, valor4 } = req.body;

  try {
    console.log('Recebido POST /notasteste2 com dados:', req.body);

    let connection = await oracledb.getConnection(dbConfig);
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    const sqlInsert = `INSERT INTO NOTASTESTE2 (MODOPAGAMENTO, PARCELAS, DATAFULL, VALOR) VALUES(:valor1, :valor2, :valor3, :valor4)`;
    let binds = { valor1, valor2, valor3, valor4 };
    const options = { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT };

    await connection.execute(sqlInsert, binds, options);
    console.log('Inserção realizada com sucesso.');

    await connection.close();
    console.log('Conexão com o banco de dados fechada com sucesso.');

    res.status(201).json({ message: 'Inserção realizada com sucesso.' });
  } catch (err) {
    console.error('Erro durante a execução:', err);
    res.status(500).json({ error: err.message });
  }
}); 

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
