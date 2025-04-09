// ...existing code...

export const login = async (username: string, password: string) => {
  return await post('/auth/login', {
    username,
    password
  })
}

// ...existing code...
