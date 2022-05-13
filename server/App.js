require('dotenv').config({ path: './config/config.env' });
const connectDB = require('./config/database');

const express = require('express');
const { createServer } = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { useServer } = require('graphql-ws/lib/use/ws');
const { WebSocketServer } = require('ws');
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { connect } = require('mqtt');
const { MQTTPubSub } = require('graphql-mqtt-subscriptions');

async function coWorking() {
    await connectDB();
    const app = express();
    const httpServer = createServer(app);
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const pubsub = new MQTTPubSub({
        client: connect('mqtt://test.mosquitto.org', {
            reconnectPeriod: 1000,
        })
    });
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    const serverCleanup = useServer({ schema, context: (ctx) => ({ ctx, pubsub }) }, wsServer);
    const server = new ApolloServer({
        schema,
        context: ({ req }) => ({ req, pubsub }),
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            await serverCleanup.dispose();
                        },
                    };
                },
            },
        ],
    });
    await server.start();
    server.applyMiddleware({ app });
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
        console.log(
            `Server is now running on http://localhost:${PORT}${server.graphqlPath}`,
        );
    });
}
coWorking();