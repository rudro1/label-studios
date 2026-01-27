import React from 'react';
import UserList from './_components/user-list';

export default function page() {
  return (
    <section className='my-5'>
      <div>
        <h1 className='font-bold text-2xl'>Members</h1>
        <p className='text-muted-foreground'>
          A list of all members of our platform
        </p>
      </div>
      <div className='my-5'>
        <UserList />
      </div>
    </section>
  );
}
