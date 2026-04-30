// File: index.js
// Part of Project: Assignment 2
// Author: Natalie Melnyk
// Purpose:
//  Routing stuff goes here
//  Module.exports for loading pages
//  processes.cwd
// Dependencies
const fs = require('fs');
const path = require('path');
const {MongoClient} = require('mongodb');

// Web link for Vercel: https://task-buddy-indol.vercel.app/

// Get connection string from env
const uri = process.env.MONGO_URI;

// Establish client on URI
const client = new MongoClient(uri);

// Create server
module.exports = async (req, res) =>{

    try{
        await client.connect(); // Conenct to client
        const buddyDatabase = client.db('TaskBuddy'); // Grab database from conneciton
        const collection = buddyDatabase.collection('buddyData'); // Grab collection from Database

        // Filter database items by type
        const plans = await collection.find({type:"plan"}).toArray();
        const features = await collection.find({type:"feature"}).toArray();

        // Display successful response with JSON
        res.status(200).json({plans, features});
    }
    catch (error)
    {
        // Display Server Error
        console.error("MongoDB Error:", error.message);
        res.status(500).json({error: 'Failed to get data -> ' + error.message});
    }
    finally
    {
        // Always close connection
        await client.close();
    }
}