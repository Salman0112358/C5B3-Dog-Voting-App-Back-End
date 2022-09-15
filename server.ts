import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import axios from "axios";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false };
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting;
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();
const http = require("http").Server(app)


app.use(express.json()); //add body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler


const client = new Client(dbConfig);
client.connect();
const io = require('socket.io')(http);
io.on("connection", (socket: any) => console.log("user has connected", socket) )


///// GET ALL DOGS//////////////////////////////////////////////////////
app.get("/", async (req, res) => {
  const allDogs = await client.query("SELECT * FROM dogs");
  res.json(allDogs.rows);
});

///// GET TOP 10 DOGS//////////////////////////////////////////////////////
app.get("/top10", async (req, res) => {
  const topTenDogs = await client.query(
    "SELECT * FROM dogs ORDER BY votes DESC, breed ASC LIMIT 10"
  );
  res.json(topTenDogs.rows);
});

///// GET SINGLE RANDOM DOG //////////////////////////////////////////////////////
app.get("/random", async (req, res) => {
  try {
    const RandomDog = await axios.get(
      "https://dog.ceo/api/breeds/image/random"
    );
    //console.log(RandomDog.data.message.split("/"))

    const perfectDog = {
      breed: RandomDog.data.message.split("/")[4],
      image: RandomDog.data.message,
    };

    //console.log(perfectDog.breed, perfectDog.image);
    res.json(perfectDog);
  } catch (error) {
    console.error(error.message);
  }
});

///// GET SINGLE RANDOM DOG FOR SPECIFIED BREED  //////////////////////////////////////////////////////

app.get("/random/:id", async (req, res) => {
  try {
    const {id} = req.params;


    if (id.indexOf("-") > -1) {
      const splitBreed = id.split("-"); //hound-ddfdsfs
      const mainBreed = splitBreed[0]; //hound
      const subBreed = splitBreed[1];

      console.log(mainBreed, subBreed)
      const RandomDog = await axios.get(
        `https://dog.ceo/api/breed/${mainBreed}/${subBreed}/images/random`
      );
      const perfectDog = {
        breed: RandomDog.data.message.split("/")[4],
        image: RandomDog.data.message,
      };

      res.json(perfectDog);

    } else {

      const RandomDog = await axios.get(
        `https://dog.ceo/api/breed/${id}/images/random`
      );
      const perfectDog = {
        breed: RandomDog.data.message.split("/")[4],
        image: RandomDog.data.message,
      };
      
      console.log("random iamge for breed found")
      res.json(perfectDog);

    }
   
  } catch (error) {
    console.error(error.message);
  }
});

///// Add Single Dog to dogs table otherwise increase vote by 1   //////////////////////////////////////////////////////
app.post("/dog", async (req, res) => {
  try {
    const { breed } = req.body;
    //hound-ddfdsfs
    if (breed.indexOf("-") > -1) {
      const splitBreed = breed.split("-"); //hound-ddfdsfs
      const mainBreed = splitBreed[0]; //hound
      const subBreed = splitBreed[1];

      console.log("sub breed detected");

      const breedCheck = await client.query(
        "SELECT * FROM dogs WHERE breed=$1",
        [breed]
      );

      if (breedCheck.rowCount === 1) {
        const increaseDogVote = await client.query(
          "UPDATE dogs SET votes= votes + 1 WHERE breed = $1 ",
          [breed]
        );
        res.json("The dog breed vote has been increased");
      } else {
        const dogImage = (
          await axios.get(
            `https://dog.ceo/api/breed/${mainBreed}/${subBreed}/images/random`
          )
        ).data.message;

        //https://dog.ceo/api/breed/hound/afghan/images/random

        await client.query("INSERT INTO dogs (breed,image) VALUES ($1, $2)", [
          breed,
          dogImage,
        ]);

        res.status(285);
        res.json("A new dog breed has been added");
      }
    } else {
      const breedCheck = await client.query(
        "SELECT * FROM dogs WHERE breed=$1",
        [breed]
      );
      if (breedCheck.rowCount === 1) {
        const increaseDogVote = await client.query(
          "UPDATE dogs SET votes= votes + 1 WHERE breed = $1 ",
          [breed]
        );
        res.json("The dog breed vote has been increase");
      } else {
        const dogImage = (
          await axios.get(`https://dog.ceo/api/breed/${breed}/images/random`)
        ).data.message;

        await client.query("INSERT INTO dogs (breed,image) VALUES ($1, $2)", [
          breed,
          dogImage,
        ]);

        res.status(285);
        res.json("A new dog breed has been added");
      }
    }
  } catch (error) {
    res.status(404);
    console.error(error.message);
  }
});

///// Get SUM for total dog votes  //////////////////////////////////////////////////////
app.get("/totalVotes", async (req, res) => {
  const voteSum = await client.query("SELECT SUM(votes) FROM dogs");

  try {
    const totalVotesObject = {
      totalVotes: voteSum.rows[0].sum,
    };
    console.log(totalVotesObject);
    res.json(totalVotesObject);
    res.status(202);
  } catch (error) {
    console.error(error.message);
  }
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}

http.listen(port, () => {
  console.log("hello world")
})

// socket io connection

io.on('connection', (socket: any) => {
  console.log('User connected' + socket.id)
})