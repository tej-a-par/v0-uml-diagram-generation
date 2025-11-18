import { z } from 'zod'

const UMLSchema = z.object({
  classes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      attributes: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
          visibility: z.enum(['public', 'private', 'protected']),
        })
      ),
      methods: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          returnType: z.string(),
          parameters: z.array(
            z.object({
              name: z.string(),
              type: z.string(),
            })
          ),
          visibility: z.enum(['public', 'private', 'protected']),
        })
      ),
    })
  ),
  relationships: z.array(
    z.object({
      id: z.string(),
      fromClass: z.string(),
      toClass: z.string(),
      type: z.enum(['association', 'aggregation', 'composition', 'inheritance', 'dependency']),
      label: z.string().optional(),
      multiplicity: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
    })
  ),
  description: z.string(),
})

function cleanClassName(name: string): string {
  return name
    .replace(/^(a|an|the|some|each|multiple|many|several|one)\s+/i, '')
    .split(/\s+/)
    .filter(w => !['or', 'more', 'the', 'a', 'an', 'some'].includes(w.toLowerCase()))
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    .trim()
}

function extractUMLFromRequirement(requirement: string) {
  const nounPattern = /\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\b/g
  let potentialClasses = [...new Set(requirement.match(nounPattern) || [])]
  
  // Clean and deduplicate class names
  potentialClasses = potentialClasses
    .map(cleanClassName)
    .filter(name => {
      // Filter out non-class words
      const nonClassWords = ['The', 'This', 'That', 'Has', 'Is', 'Are', 'But', 'Or', 'And', 'With', 'For', 'As', 'On', 'When', 'Which', 'Created', 'Most', 'Popular']
      return name.length > 1 && !nonClassWords.includes(name)
    })
    .filter((name, index, arr) => arr.indexOf(name) === index) // Remove duplicates

  console.log('[v0] Cleaned classes:', potentialClasses)

  const relationships: any[] = []
  const relationshipSet = new Set<string>()

  const relationshipPatterns = [
    // Explicit relationships
    { regex: /([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s+creates?\s+(?:a\s+)?(?:an\s+)?(?:the\s+)?(?:multiple\s+)?(?:many\s+)?([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)/gi, label: 'creates', type: 'association', multiplicity: { from: '1', to: '*' } },
    { regex: /([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s+contains?\s+(?:a\s+)?(?:an\s+)?(?:the\s+)?(?:multiple\s+)?(?:many\s+)?([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)/gi, label: 'contains', type: 'composition', multiplicity: { from: '1', to: '*' } },
    { regex: /([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s+references?\s+(?:a\s+)?(?:an\s+)?(?:the\s+)?(?:multiple\s+)?(?:many\s+)?([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)/gi, label: 'references', type: 'association', multiplicity: { from: '*', to: '*' } },
    { regex: /([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s+aggregates?\s+(?:a\s+)?(?:an\s+)?(?:the\s+)?(?:multiple\s+)?(?:many\s+)?([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)/gi, label: 'aggregates', type: 'aggregation', multiplicity: { from: '1', to: '*' } },
    { regex: /([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s+manages?\s+(?:a\s+)?(?:an\s+)?(?:the\s+)?(?:multiple\s+)?(?:many\s+)?([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)/gi, label: 'manages', type: 'association', multiplicity: { from: '1', to: '*' } },
    // Implicit "has" relationships - e.g., "Song has title" means Song class has attributes
    { regex: /([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s+(?:is\s+)?(?:has?\s+)?(?:a\s+)?(?:an\s+)?(?:the\s+)?([a-z][a-z]*(?:\s+[a-z]+)*)/gi, label: 'has', type: 'composition', multiplicity: { from: '1', to: '*' } },
    // Inheritance patterns
    { regex: /([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s+is\s+a(?:n)?\s+([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)/gi, label: 'inherits', type: 'inheritance' },
  ]

  relationshipPatterns.forEach(({ regex, label, type, multiplicity }) => {
    let match
    while ((match = regex.exec(requirement)) !== null) {
      let class1Name = cleanClassName(match[1])
      let class2Name = cleanClassName(match[2])

      // Skip if extracting attributes (lowercase to lowercase relationship)
      if (label === 'has' && match[2] === match[2].toLowerCase()) {
        continue
      }

      // Find exact matches in cleaned classes
      const class1 = potentialClasses.find(c => c.toLowerCase() === class1Name.toLowerCase())
      const class2 = potentialClasses.find(c => c.toLowerCase() === class2Name.toLowerCase())

      if (class1 && class2 && class1 !== class2) {
        const key = `${class1}-${class2}-${label}`
        if (!relationshipSet.has(key)) {
          relationships.push({
            id: `rel-${relationships.length}`,
            fromClass: class1,
            toClass: class2,
            type: type,
            label: label,
            multiplicity: multiplicity,
          })
          relationshipSet.add(key)
          console.log(`[v0] Found ${type} relationship: ${class1} --${label}--> ${class2}`)
        }
      }
    }
  })

  console.log(`[v0] Total relationships found: ${relationships.length}`)

  const attributeMap: Record<string, string[]> = {
    User: ['username', 'password', 'email', 'id'],
    Admin: ['username', 'password', 'email', 'id', 'role', 'permissions'],
    Product: ['id', 'name', 'description', 'price', 'stock'],
    Order: ['id', 'orderDate', 'totalAmount', 'status'],
    Customer: ['id', 'name', 'email', 'address', 'phone'],
    Account: ['id', 'accountNumber', 'balance', 'type'],
    Employee: ['id', 'name', 'email', 'department', 'salary'],
    Post: ['id', 'title', 'content', 'author', 'createdAt'],
    Email: ['id', 'sender', 'recipient', 'subject', 'body'],
    Warehouse: ['id', 'location', 'capacity'],
    InventoryItem: ['quantity', 'name', 'sku'],
    Shipment: ['trackingNumber', 'shipmentDate', 'status'],
    Playlist: ['name'],
    Song: ['title', 'artist'],
    Album: ['title', 'releaseDate'],
  }

  const methodMap: Record<string, Array<{ name: string; returnType: string; params: Array<{ name: string; type: string }> }>> = {
    User: [
      { name: 'login', returnType: 'boolean', params: [{ name: 'username', type: 'string' }, { name: 'password', type: 'string' }] },
      { name: 'logout', returnType: 'void', params: [] },
      { name: 'updateProfile', returnType: 'void', params: [{ name: 'data', type: 'object' }] },
    ],
    Admin: [
      { name: 'login', returnType: 'boolean', params: [{ name: 'username', type: 'string' }, { name: 'password', type: 'string' }] },
      { name: 'manageUsers', returnType: 'void', params: [{ name: 'userId', type: 'string' }] },
      { name: 'generateReport', returnType: 'Report', params: [] },
    ],
    Product: [
      { name: 'getDetails', returnType: 'object', params: [] },
      { name: 'updateStock', returnType: 'void', params: [{ name: 'quantity', type: 'number' }] },
    ],
    Order: [
      { name: 'calculateTotal', returnType: 'number', params: [] },
      { name: 'updateStatus', returnType: 'void', params: [{ name: 'status', type: 'string' }] },
    ],
    Email: [
      { name: 'send', returnType: 'boolean', params: [] },
      { name: 'markAsRead', returnType: 'void', params: [] },
    ],
    Warehouse: [
      { name: 'addInventory', returnType: 'void', params: [{ name: 'item', type: 'InventoryItem' }] },
      { name: 'getInventory', returnType: 'InventoryItem[]', params: [] },
    ],
    InventoryItem: [
      { name: 'updateQuantity', returnType: 'void', params: [{ name: 'quantity', type: 'int' }] },
      { name: 'getDetails', returnType: 'object', params: [] },
    ],
    Shipment: [
      { name: 'track', returnType: 'object', params: [] },
      { name: 'updateStatus', returnType: 'void', params: [{ name: 'status', type: 'string' }] },
    ],
  }

  const classes = potentialClasses.map((className, index) => ({
    id: `class-${index}`,
    name: className,
    attributes: (attributeMap[className] || []).map((attr, idx) => ({
      id: `attr-${index}-${idx}`,
      name: attr,
      type: attr === 'id' ? 'string' : attr.includes('quantity') ? 'int' : attr.includes('Date') || attr.includes('date') ? 'Date' : 'string',
      visibility: 'private' as const,
    })),
    methods: (methodMap[className] || []).map((method, idx) => ({
      id: `method-${index}-${idx}`,
      name: method.name,
      returnType: method.returnType,
      parameters: method.params,
      visibility: 'public' as const,
    })),
  }))

  return {
    classes,
    relationships,
    description: `Extracted UML model from requirement: "${requirement.substring(0, 100)}..."`,
  }
}

export async function POST(request: Request) {
  try {
    const { requirement } = await request.json()

    if (!requirement || requirement.trim().length === 0) {
      return Response.json({ error: 'Requirement is required' }, { status: 400 })
    }

    const result = extractUMLFromRequirement(requirement)
    const validated = UMLSchema.parse(result)

    return Response.json(validated)
  } catch (error) {
    console.error('Extraction error:', error)
    return Response.json({ error: 'Failed to extract UML model' }, { status: 500 })
  }
}
