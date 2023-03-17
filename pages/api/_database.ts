import { MongoClient, Db, Collection } from 'mongodb';

let client : MongoClient | null = null;

const getDatabase = async () => {
  if (!client) {
    console.log('Connecting to database', process.env.DATABASE_URL);
    client = await MongoClient.connect(process.env.DATABASE_URL!, {
        // @ts-ignore
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
  return client!.db();
};

const getCollection = async (name: string) => {
  const database = await getDatabase();
  return database.collection(name);
};

export { getCollection };
