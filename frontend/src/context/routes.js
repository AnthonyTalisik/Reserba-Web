/** Where each role lands after logging in. */
export const homeFor = (user) => (user && user.role === 'ADMIN' ? '/admin/requests' : '/rooms')
