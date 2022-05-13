import React from 'react';
import App from './App';
import ApolloClient from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { createHttpLink } from 'apollo-link-http';
import { ApolloProvider } from '@apollo/react-hooks';
import { setContext } from 'apollo-link-context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({
  uri: 'http://localhost:5000/graphql'
});

const authFunc = ()=>{
  const token = localStorage.getItem('jwtToken');
  return token ? `Bearer ${token}` : '';
}

const authLink = setContext(() => {
  return {
    headers: {
      authorization: authFunc()
    }
  };
});
const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:5000/graphql',
  connectionParams: {
    Authorization: authFunc(),
  }
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink),
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});

export default (
  <ApolloProvider client={client} >
    <App />
  </ApolloProvider>
);
