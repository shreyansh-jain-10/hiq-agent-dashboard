/**
 * Utility functions for site management
 */

export const getSiteName = (siteId, sites) => {
  const site = sites.find((s) => s.id === siteId)
  return site ? site.display_name : 'Unknown Site'
}

export const getUserSites = (userId, userSites) => {
  return userSites.filter((us) => us.user_id === userId)
}
