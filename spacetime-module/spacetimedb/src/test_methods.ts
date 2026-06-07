import { schema, table, t, ReducerCtx } from 'spacetimedb/server';

const spacetimedb = schema({
  meeting: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      title: t.string(),
    }
  )
});

type S = typeof spacetimedb.schemaType;

export const testReducer = spacetimedb.reducer(
  {
  },
  (ctx: ReducerCtx<S>, {}) => {
    // Check available methods on ctx.db.meeting
    const keys = Object.keys(ctx.db.meeting);
    console.log(keys);
  }
);
