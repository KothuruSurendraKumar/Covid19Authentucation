const express = require("express");

const path = require("path");

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);

    process.exit(1);
  }
};

initializeDBAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,

    stateName: dbObject.state_name,

    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,

    districtName: dbObject.district_name,

    stateId: dbObject.state_id,

    cases: dbObject.cases,

    cured: dbObject.cured,

    active: dbObject.active,

    deaths: dbObject.deaths,
  };
};

function authenticate(request, response, next) {
  let jwtToken;

  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);

    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);

        response.send("Invalid JWT Token");
      } else {
        //request.username = payload.username;

        next();
      }
    });
  }
}

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);

    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };

      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");

      response.send({ jwtToken });
    } else {
      response.status(400);

      response.send("Invalid password");
    }
  }
});

app.get("/states/", authenticate, async (request, response) => {
  const getStatesQuery = `

            SELECT

              *

            FROM

             state;`;

  const statesArray = await db.all(getStatesQuery);

  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});

app.get("/states/:stateId/", authenticate, async (request, response) => {
  const { stateId } = request.params;

  const getStateQuery = `

      SELECT

       *

      FROM

       state

      WHERE

       state_id = ${stateId};

    `;

  const state = await db.get(getStateQuery);

  response.send(convertStateDbObjectToResponseObject(state));
});

app.post("/districts/", authenticate, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const createBookQuery = `

      INSERT INTO 

        district (district_name,state_id,cases,cured,active,deaths) 

      VALUES 

        (

          '${districtName}', 

          '${stateId}',

          '${cases}', 

          '${cured}',

          '${active}',

          '${deaths}'

        )`;

  await db.run(createBookQuery);

  response.send(`District Successfully Added`);
});

app.get("/districts/:districtId/", authenticate, async (request, response) => {
  const { districtId } = request.params;

  const getDistrictQuery = `

      SELECT

       *

      FROM

       district

      WHERE

       district_id = ${districtId};

    `;

  const district = await db.get(getDistrictQuery);

  response.send(convertDistrictDbObjectToResponseObject(district));
});

app.delete(
  "/districts/:districtId/",

  authenticate,

  async (request, response) => {
    const { districtId } = request.params;

    const deleteQuery = `DELETE FROM district WHERE district_id='${districtId}';`;

    await db.run(deleteQuery);

    response.send("District Removed");
  }
);

app.put("/districts/:districtId/", authenticate, async (request, response) => {
  const { districtId } = request.params;

  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateDistrictQuery = `

  UPDATE

    district

  SET

   district_name ='${districtName}',

   state_id ='${stateId}',

   cases ='${cases}',

   cured ='${cured}',

   active ='${active}',

   deaths ='${deaths}'

  WHERE

    district_id = ${districtId};`;

  await database.run(updateDistrictQuery);

  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", authenticate, async (request, response) => {
  const { stateId } = request.params;

  const getStateStatsQuery = `

    SELECT

      SUM(cases),

      SUM(cured),

      SUM(active),

      SUM(deaths)

    FROM

      district

    WHERE

      state_id=${stateId};`;

  const stats = await database.get(getStateStatsQuery);

  response.send({
    totalCases: stats["SUM(cases)"],

    totalCured: stats["SUM(cured)"],

    totalActive: stats["SUM(active)"],

    totalDeaths: stats["SUM(deaths)"],
  });
});

module.exports = app;
