const mongoose = require('mongoose')
// Create a connection using mongoose (ExpressJS)
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'TaskBuddy'
        })
        console.log(`[DB] MongoDB Connected: ${conn.connection.host}`)
    } catch (error) {
        console.error(`[DB] Error: ${error.message}`)
        process.exit(1)
    }
}
// Export function
module.exports = connectDB