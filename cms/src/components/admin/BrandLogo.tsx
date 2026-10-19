import Image from 'next/image'

import logo from './brand-logo.svg'

/**
 * Shikkha24 logo for the Payload login screen.
 */
export function BrandLogo() {
  return <Image src={logo} alt="Shikkha24" width={48} height={48} priority />
}
