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

    const database = client.db("assignmintDB");

    // POST - Add a new comment
    app.post('/comments', async (req, res) => {
      try {
        const commentData = req.body;
        
        // Validate required fields
        if (!commentData.assignmentId || !commentData.comment || !commentData.userEmail) {
          return res.status(400).json({ 
            error: 'Missing required fields: assignmentId, comment, and userEmail are required' 
          });
        }

        // Create comment object
        const newComment = {
          assignmentId: commentData.assignmentId,
          userEmail: commentData.userEmail,
          userName: commentData.userName || 'Anonymous',
          userPhoto: commentData.userPhoto || '',
          comment: commentData.comment,
          createdAt: commentData.createdAt || new Date().toISOString(),
        };

        const commentsCollection = database.collection('comments');
        const result = await commentsCollection.insertOne(newComment);

        res.status(201).json({
          message: 'Comment added successfully',
          commentId: result.insertedId,
          comment: newComment
        });
      } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
      }
    });

    // GET - Fetch all comments for a specific assignment
    app.get('/assignments/:id/comments', async (req, res) => {
      try {
        const assignmentId = req.params.id;
        
        const commentsCollection = database.collection('comments');
        const comments = await commentsCollection
          .find({ assignmentId: assignmentId })
          .sort({ createdAt: -1 }) // Most recent first
          .toArray();

        res.status(200).json(comments);
      } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
      }
    });

    // Optional: DELETE - Delete a comment (if user is the owner)
    app.delete('/comments/:id', async (req, res) => {
      try {
        const commentId = req.params.id;
        const userEmail = req.body.userEmail; // Or get from auth token

        const commentsCollection = database.collection('comments');
        
        // First check if comment belongs to user
        const comment = await commentsCollection.findOne({ 
          _id: new ObjectId(commentId) 
        });

        if (!comment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.userEmail !== userEmail) {
          return res.status(403).json({ error: 'Unauthorized to delete this comment' });
        }

        const result = await commentsCollection.deleteOne({ 
          _id: new ObjectId(commentId) 
        });

        if (result.deletedCount === 1) {
          res.status(200).json({ message: 'Comment deleted successfully' });
        } else {
          res.status(404).json({ error: 'Comment not found' });
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
      }
    });

    // Optional: PUT - Edit a comment (if user is the owner)
    app.put('/comments/:id', async (req, res) => {
      try {
        const commentId = req.params.id;
        const { userEmail, comment } = req.body;

        if (!comment || !comment.trim()) {
          return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        const commentsCollection = database.collection('comments');
        
        // Check if comment belongs to user
        const existingComment = await commentsCollection.findOne({ 
          _id: new ObjectId(commentId) 
        });

        if (!existingComment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        if (existingComment.userEmail !== userEmail) {
          return res.status(403).json({ error: 'Unauthorized to edit this comment' });
        }

        const result = await commentsCollection.updateOne(
          { _id: new ObjectId(commentId) },
          { 
            $set: { 
              comment: comment,
              updatedAt: new Date().toISOString()
            } 
          }
        );

        if (result.modifiedCount === 1) {
          res.status(200).json({ message: 'Comment updated successfully' });
        } else {
          res.status(404).json({ error: 'Comment not found' });
        }
      } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ error: 'Failed to update comment' });
      }
    });


    // ============================================
    // 1. ADD BOOKMARK
    // POST /bookmarks
    // ============================================
    app.post('/bookmarks', async (req, res) => {
      try {
        const bookmarkData = req.body;
        
        // Validate required fields
        if (!bookmarkData.assignmentId || !bookmarkData.userEmail) {
          return res.status(400).json({ 
            error: 'Missing required fields: assignmentId and userEmail are required' 
          });
        }

        const bookmarksCollection = database.collection('bookmarks');

        // Check if bookmark already exists
        const existingBookmark = await bookmarksCollection.findOne({
          assignmentId: bookmarkData.assignmentId,
          userEmail: bookmarkData.userEmail
        });

        if (existingBookmark) {
          return res.status(409).json({ 
            error: 'Assignment already bookmarked',
            bookmark: existingBookmark 
          });
        }

        // Create bookmark object
        const newBookmark = {
          assignmentId: bookmarkData.assignmentId,
          userEmail: bookmarkData.userEmail,
          assignmentTitle: bookmarkData.assignmentTitle || '',
          assignmentPhoto: bookmarkData.assignmentPhoto || '',
          assignmentMarks: bookmarkData.assignmentMarks || 0,
          assignmentDueDate: bookmarkData.assignmentDueDate || '',
          bookmarkedAt: bookmarkData.bookmarkedAt || new Date().toISOString(),
        };

        // Insert new bookmark
        const result = await bookmarksCollection.insertOne(newBookmark);

        res.status(201).json({
          message: 'Bookmark added successfully',
          bookmarkId: result.insertedId,
          bookmark: newBookmark
        });

      } catch (error) {
        console.error('Error adding bookmark:', error);
        res.status(500).json({ error: 'Failed to add bookmark' });
      }
    });

    // ============================================
    // 2. REMOVE BOOKMARK
    // DELETE /bookmarks/:assignmentId
    // Query param: email (user's email)
    // ============================================
    app.delete('/bookmarks/:assignmentId', async (req, res) => {
      try {
        const { assignmentId } = req.params;
        const { email } = req.query;

        if (!email) {
          return res.status(400).json({ error: 'User email is required as query parameter' });
        }

        const bookmarksCollection = database.collection('bookmarks');

        const result = await bookmarksCollection.deleteOne({
          assignmentId: assignmentId,
          userEmail: email
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Bookmark not found' });
        }

        res.status(200).json({
          message: 'Bookmark removed successfully',
          deletedCount: result.deletedCount
        });

      } catch (error) {
        console.error('Error removing bookmark:', error);
        res.status(500).json({ error: 'Failed to remove bookmark' });
      }
    });

    // ============================================
    // 3. CHECK BOOKMARK STATUS
    // GET /bookmarks/check/:assignmentId
    // Query param: email (user's email)
    // ============================================
    app.get('/bookmarks/check/:assignmentId', async (req, res) => {
      try {
        const { assignmentId } = req.params;
        const { email } = req.query;

        if (!email) {
          return res.status(400).json({ error: 'User email is required as query parameter' });
        }

        const bookmarksCollection = database.collection('bookmarks');

        const bookmark = await bookmarksCollection.findOne({
          assignmentId: assignmentId,
          userEmail: email
        });

        res.status(200).json({
          isBookmarked: !!bookmark,
          bookmark: bookmark || null
        });

      } catch (error) {
        console.error('Error checking bookmark status:', error);
        res.status(500).json({ error: 'Failed to check bookmark status' });
      }
    });

    // ============================================
    // 4. GET USER'S BOOKMARKS
    // GET /bookmarks/user/:email
    // ============================================
    app.get('/bookmarks/user/:email', async (req, res) => {
      try {
        const { email } = req.params;

        const bookmarksCollection = database.collection('bookmarks');

        const bookmarks = await bookmarksCollection
          .find({ userEmail: email })
          .sort({ bookmarkedAt: -1 })
          .toArray();

        res.status(200).json({
          count: bookmarks.length,
          bookmarks: bookmarks
        });

      } catch (error) {
        console.error('Error fetching user bookmarks:', error);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
      }
    });

    // ============================================
    // 5. GET BOOKMARK COUNT FOR ASSIGNMENT
    // GET /bookmarks/count/:assignmentId
    // ============================================
    app.get('/bookmarks/count/:assignmentId', async (req, res) => {
      try {
        const { assignmentId } = req.params;

        const bookmarksCollection = database.collection('bookmarks');

        const count = await bookmarksCollection.countDocuments({
          assignmentId: assignmentId
        });

        res.status(200).json({
          assignmentId: assignmentId,
          bookmarkCount: count
        });

      } catch (error) {
        console.error('Error counting bookmarks:', error);
        res.status(500).json({ error: 'Failed to count bookmarks' });
      }
    });

    // ============================================
    // 6. GET ALL BOOKMARKS (Optional - for admin)
    // GET /bookmarks
    // ============================================
    app.get('/bookmarks', async (req, res) => {
      try {
        const bookmarksCollection = database.collection('bookmarks');

        const bookmarks = await bookmarksCollection
          .find({})
          .sort({ bookmarkedAt: -1 })
          .toArray();

        res.status(200).json({
          count: bookmarks.length,
          bookmarks: bookmarks
        });

      } catch (error) {
        console.error('Error fetching all bookmarks:', error);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
      }
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