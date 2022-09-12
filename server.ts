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
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

///// GET ALL DOGS//////////////////////////////////////////////////////
app.get("/", async (req, res) => {
  const allDogs = await client.query('SELECT * FROM dogs');
  res.json(allDogs.rows);
});

///// GET TOP 10 DOGS//////////////////////////////////////////////////////
app.get("/top10", async (req, res) => {
  const topTenDogs = await client.query('SELECT * FROM dogs ORDER BY votes DESC LIMIT 10');
  res.json(topTenDogs.rows);
});


///// GET SINGLE RANDOM DOG //////////////////////////////////////////////////////
app.get("/random" , async(req,res) => {

  try {

    const RandomDog = await axios.get("https://dog.ceo/api/breeds/image/random")
    //console.log(RandomDog.data.message.split("/"))

    const perfectDog = {

      breed : (RandomDog.data.message.split("/"))[4],
      image : RandomDog.data.message

    }

    //console.log(perfectDog.breed, perfectDog.image);
    res.json(perfectDog);

  } catch (error) {
    console.error(error.message);
    
  }
})

///// Add Single Dog to dogs table otherwise increase vote by 1   //////////////////////////////////////////////////////
app.post("/dog", async(req,res) => {

  try {
    const {breed} = req.body;
    const breedCheck = await client.query("SELECT * FROM dogs WHERE breed=$1",[breed])
    if (breedCheck.rowCount === 1){

      const increaseDogVote = await client.query("UPDATE dogs SET votes= votes + 1 WHERE breed = $1 ", [breed])
      res.json("The dog breed vote has been increase")

    } else {
      const dogImage = (await axios.get(`https://dog.ceo/api/breed/${breed}/images/random`)).data.message

      await client.query("INSERT INTO dogs (breed,image) VALUES ($1, $2)" , [breed, dogImage])
    
      res.json("A new dog breed has been added")

    }
  } catch (error) {
    console.error(error.message);
  }
} )


//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
