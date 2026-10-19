import Image from 'next/image'

import icon from './brand-icon.svg'

/**
 * Shikkha24 mark for the Payload admin navigation.
 */
export function BrandIcon() {
  return (
    <Image
      src={icon}
      alt="Shikkha24"
      width={18}
      height={18}
      priority
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  )
}
