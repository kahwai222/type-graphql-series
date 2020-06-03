import 'reflect-metadata';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import session from 'express-session';
import connectRedis from 'connect-redis';

import { redis } from './redis';

const main = async () => {
  await createConnection();

  const schema = await buildSchema({
    resolvers: [__dirname + '/modules/**/*.ts'],
    authChecker: ({ context: { req } }) => {
      return !!req.session.userId;
    }
  });

  const apolloServer = new ApolloServer({
    schema,
    context: ({ req }) => ({ req }),
  });

  const app = express();

  const RedisStore = connectRedis(session);

  app.use(
    session({
      store: new RedisStore({
        client: redis,
      }),
      name: 'qid',
      secret: 'asdfkjadsl',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7 * 365,  // 7 years
      },
    }),
  );

  const corsOptions = {
    credentials: true,
    origin: 'http://localhost:3000',
  };

  apolloServer.applyMiddleware({ app, cors: corsOptions });

  app.listen(4000, () => {
    console.log('Server started on http://localhost:4000/graphql');
  });
}

main();
