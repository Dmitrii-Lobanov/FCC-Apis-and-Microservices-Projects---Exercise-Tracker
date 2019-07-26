const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost/tracker", {
	useNewUrlParser: true
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => res.sendFile(__dirname + "/public/index.html"));

// Error handling middleware
app.use((err, req, res, next) => {
	let errCode, errMessage;
	if (err.errors) {
		errCode = 400;
		const keys = Object.keys(err.errors);
		errMessage = err.errors[keys[0]].message;
	} else {
		errCode = err.status || 500;
		errMessage = err.message || "Internal Server Error";
	}
	res
		.status(errCode)
		.type("txt")
		.send(errMessage);
});

let userSchema = new mongoose.Schema({
	username: String
});

let User = mongoose.model("User", userSchema);

// Add new user
app.post("/api/exercise/new-user", (req, res) => {
	let username = req.body.username;
	User.findOne({ username: username }, (err, storedUsername) => {
		if (err) return;
		if (storedUsername) {
			res.send("The username " + username + "has already been taken.");
		} else {
			let newUser = new User({ username: username });
			newUser.save((err, createUser) => {
				if (err) return;
				res.json({ username: username, _id: createUser._id });
			});
		}
	});
});

// Get all users
app.get("/api/exercise/users", (rew, res) => {
	User.find({}, "username _id", (err, users) => {
		let output = [];
		users.map(user => output.push(user));
		res.send(output);
	});
});

let exerciseSchema = new mongoose.Schema({
	userId: { type: String, required: true },
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: { type: Date, default: Date.now }
});

let Exercise = mongoose.model("Exercise", exerciseSchema);

// Add a new exercise for a user
app.post("/api/exercise/add", (req, res) => {
	let userId = req.body.userId;
	let description = req.body.description;
	let duration = req.body.duration;
	let date = req.body.date;

	User.findById(userId, (err, user) => {
		if (err) return;
		if (user) {
			let newExercise = new Exercise({
				userId: user._id,
				description: description,
				duration: duration
			});

			if (date.length > 0) {
				newExercise.date = new Date(date);
			}

			newExercise.save((err, createdExercise) => {
				if (err) return;
				res.json({
					userId: userId,
					description: description,
					duration: duration,
					date: createdExercise.date,
					_id: createdExercise._id
				});
			});
		}
	});
});

// Get a list of all exercises for a given user
app.get("/api/exercise/log/:userId", (req, res) => {
	let userId = req.params.userId;
	let from = req.query.from;
	let to = req.query.to;
	let limit = req.query.limit;

	User.findById(userId, "username _id", (err, user) => {
		if (err) return;
		if (from === undefined) from = new Date(0);
		if (to === undefined) to = new Date();
		if (limit === undefined) {
			limit = 0;
		} else {
			limit = parseInt(limit);
		}

		let query = Exercise.find(
			{ userId: userId, date: { $gte: from, $lte: to } },
			"description duration date _id",
			err => {
				if (err) return;
			}
		)
			.sort({ date: -1 })
			.limit(limit);

		query.exec((err, exercises) => {
			if (err) return;
			res.json({ user: user, exercises: exercises });
		});
	});
});

app.listen(process.env.PORT || 3000, () => console.log("It works"));
