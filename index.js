const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

//Middlware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tur8sdy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const assignmentCollection = client.db('assignmintDB').collection('assignments');
    
    app.post('/create-assignment', async (req, res) => {
        const newAssignment = req.body;
        console.log(newAssignment)
        const result = await assignmentCollection.insertOne(newAssignment);
        res.send(result);
    })

    app.get('/assignments', async (req, res) => {
        const query = {};
        const cursor = assignmentCollection.find(query);
        const assignments = await cursor.toArray();
        res.send(assignments);
    })

    app.delete('/assignment/:id', async (req, res) =>{
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await assignmentCollection.deleteOne(query);
        res.send(result);
    })

    app.put('/assignment/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }
        const options = { upsert: true };
        const updatedAssignment = req.body; 
        delete updatedAssignment._id;
        
        const updateDoc = {
          $set: updatedAssignment
        }

        const result = await assignmentCollection.updateOne(filter, updateDoc, options);
        res.send(result);
    })


    const submittedAssignmentCollection = client.db('assignmintDB').collection('submittedAssignments');

    app.post('/submitted-assignment', async (req, res) => {
        const submittedAssignment = req.body;
        const result = await submittedAssignmentCollection.insertOne(submittedAssignment);
        res.send(result);
    })

    app.get('/pending-assignments', async (req, res) => {
      const result = await submittedAssignmentCollection
        .find({ status: 'pending' })
        .toArray();
      res.send(result);
    });


    app.patch("/submitted-assignments/:id", async (req, res) => {
      const { id } = req.params;
      const { obtainedMark, feedback } = req.body;

      try {
        const result = await submittedAssignmentCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "completed",
              obtainedMark: parseFloat(obtainedMark),
              feedback: feedback || "", // optional
            },
          }
        );

        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Assignment marked successfully" });
        } else {
          res.status(404).send({ success: false, message: "Assignment not found" });
        }
      } catch (error) {
        console.error("Error marking assignment:", error);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });


    app.get('/my-submitted-assignments', async (req, res) => {
      const email = req.query.email;
      const result = await submittedAssignmentCollection
        .find({ email })
        .toArray();
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Assignmeint Server Running!!!');
});

app.listen(port, () => {
  console.log(`Assignmint server running on port ${port}`);
});