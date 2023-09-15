// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { randomBytes } = require('crypto');

// Create express app
const app = express();
app.use(bodyParser.json());

// Store comments
const commentsByPostId = {};

// Listen on port 4001
app.listen(4001, () => {
  console.log('Listening on 4001');
});

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment by post id
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Get comments for post id
  const comments = commentsByPostId[req.params.id] || [];

  // Add new comment
  comments.push({ id: commentId, content, status: 'pending' });

  // Store comments
  commentsByPostId[req.params.id] = comments;

  // Emit event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  });

  // Send response
  res.status(201).send(comments);
});

// Post event
app.post('/events', async (req, res) => {
  const { type, data } = req.body;

  // If comment is moderated
  if (type === 'CommentModerated') {
    // Get comments for post id
    const comments = commentsByPostId[data.postId];

    // Get comment
    const comment = comments.find(comment => {
      return comment.id === data.id;
    });

    // Update status
    comment.status = data.status;

    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id: data.id,
        status: data.status,
        content: data.content,
        postId: data.postId
      }
    });
  }

  // Send response
  res.send({});
});