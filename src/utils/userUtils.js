/**
 * Utility functions for user management
 */

export const getUserRole = (user) => {
  if (typeof user?.role === 'string') return user.role.toLowerCase()
  if (typeof user?.is_admin === 'boolean') return user.is_admin ? 'admin' : 'user'
  return 'user'
}

export const getIsAdmin = (user) => getUserRole(user) === 'admin'

export const getInitial = (user) => {
  const name = user?.email || 'U'
  const first = String(name).trim().charAt(0)
  return first ? first.toUpperCase() : 'U'
}

export const generatePassword = () => {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let pwd = ''
  for (let i = 0; i < length; i++) {
    pwd += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return pwd
}

export const sendConfirmationEmail = async (userEmail, userPassword, userRole, assignedSites) => {
  try {
    const response = await fetch('https://gluagents.xyz/webhook/send-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        password: userPassword,
        role: userRole,
        sites_assigned: assignedSites
      })
    })
    
    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`)
    }
    
    return true
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
    return false
  }
}
