const oracledb = require('oracledb');

async function init() {
  try {
    console.log('Iniciando initOracleClient...');
    oracledb.initOracleClient({ libDir: 'C:\\instantclient_21_13' });
    console.log('initOracleClient executado com sucesso.');

    // Configuração do banco de dados
    const dbConfig = {
      user: 'CLIENTES_CNPJ_NOVO',
      password: 'D_d2017',
      connectString: '127.0.0.1:1521/XE'
    };

    // Conectar ao banco de dados
    let connection = await oracledb.getConnection(dbConfig);
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    /* SELECT */
    let select1 = 'SELECT * FROM NOTASTESTE2';
    let allProducts = await connection.execute(select1, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('Resultado do SELECT:', allProducts.rows);

    /* INSERT */
    const sqlInsert = `INSERT INTO NOTASTESTE2 (MODOPAGAMENTO, PARCELAS, DATAFULL, VALOR) VALUES(:valor1, :valor2, :valor3, :valor4)`;
    let binds = {
      valor1: "debito",
      valor2: "1x",
      valor3: "21/05/2024",
      valor4: 200
    };

    const options = {
      autoCommit: true,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };

    await connection.execute(sqlInsert, binds, options);
    console.log('Inserção realizada com sucesso.');

    await connection.close();
    console.log('Conexão com o banco de dados fechada com sucesso.');
  } catch (err) {
    console.error('Erro durante a execução:', err);
  }
}

init();
