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
  const { valor1, valor2, valor3, valor4, valor5, valor6, valor7, valor8, itens2, itens3 } = req.body;

  try {
    console.log('Recebido POST /notasteste2 com dados:', req.body);

    let connection = await oracledb.getConnection(dbConfig);
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Inicia uma transação
    await connection.execute('BEGIN');

    const sqlInsertPedido = `INSERT INTO PEDIDO_PAG_SIMPLES (ID, MODOPAGAMENTO, PARCELAS, DATAFULL, VALOR, CAUT_YA07, TBAND_YA06, CNPJ_YA05) VALUES (:valor1, :valor2, :valor3, :valor4, :valor5, :valor6, :valor7, :valor8)`;
    let bindsPedido = { valor1, valor2, valor3, valor4, valor5, valor6, valor7, valor8 };
    const options = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };

    await connection.execute(sqlInsertPedido, bindsPedido, options);
    console.log('Inserção em PEDIDO_PAG_SIMPLES realizada com sucesso.');

    const sqlInsertItens = `INSERT INTO ITENS (ID, ITEM, QTD) VALUES (:id, itens2 ,itens3)`;
    for (const item of itens) {
      let bindsItem = { id: valor1, itens2 ,itens3 };
      await connection.execute(sqlInsertItens, bindsItem, options);
    }
    console.log('Inserção em ITENS realizada com sucesso.');

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

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
