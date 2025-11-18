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

function extractUMLFromRequirement(requirement: string) {
  // First, clean up the requirement by removing leading articles
  const cleanedRequirement = requirement
    .replace(/\b(A|An|The)\s+([A-Z])/g, '$2') // Remove leading articles
    .replace(/\b(Each|Some)\s+([A-Z])/g, '$2')

  const nounPattern = /\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\b/g
  let potentialClasses = [...new Set(cleanedRequirement.match(nounPattern) || [])]
    .filter(word => word.length > 2 && !['The', 'This', 'That', 'Has', 'Is', 'Are', 'A', 'An', 'But', 'Or', 'And', 'With', 'For', 'Each', 'Some', 'Orders', 'Can', 'Be', 'As', 'On', 'When', 'Multiple', 'One', 'Which'].includes(word))

  potentialClasses = potentialClasses.filter((word, index, arr) => {
    // Check if this is a plural form
    if (word.endsWith('s') && word !== 'Items' && word !== 'Products') {
      const singular = word.slice(0, -1)
      if (arr.some(w => w === singular)) {
        return false // Remove plural if singular exists
      }
    }
    return true
  })

  const relationships: any[] = []
  const relationshipSet = new Set<string>()

  // Association patterns - now matching against CLEANED requirement
  const associationPatterns = [
    { pattern: /(\w+(?:\s+\w+)*?)\s+manages?\s+(?:multiple\s+)?(\w+(?:\s+\w+)*?)\s*[.,]/gi, label: 'manages' },
    { pattern: /(\w+(?:\s+\w+)*?)\s+references?\s+(\w+(?:\s+\w+)*?)\s*[.,]/gi, label: 'references' },
    { pattern: /(\w+(?:\s+\w+)*?)\s+(?:uses|depends\s+on)\s+(\w+(?:\s+\w+)*?)\s*[.,]/gi, label: 'uses' },
    { pattern: /(\w+(?:\s+\w+)*?)\s+(?:is\s+)?associated\s+with\s+(\w+(?:\s+\w+)*?)\s*[.,]/gi, label: 'associates' },
  ]

  associationPatterns.forEach(({ pattern, label }) => {
    let match
    const regex = new RegExp(pattern.source, 'gi')
    while ((match = regex.exec(cleanedRequirement)) !== null) {
      let class1Name = match[1].trim()
      let class2Name = match[2].trim()
      
      // Remove plurals for matching - convert "Items" to "Item"
      if (class2Name.endsWith('s') && !class2Name.endsWith('ss')) {
        class2Name = class2Name.slice(0, -1)
      }
      
      // Capitalize first letter of each word
      class1Name = class1Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim()
      class2Name = class2Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim()
      
      // Find matching classes (case-insensitive, handling space variations)
      const class1 = potentialClasses.find(c => 
        c.toLowerCase() === class1Name.toLowerCase() || 
        c.toLowerCase().replace(/\s+/g, '') === class1Name.toLowerCase().replace(/\s+/g, '')
      )
      const class2 = potentialClasses.find(c => 
        c.toLowerCase() === class2Name.toLowerCase() || 
        c.toLowerCase().replace(/\s+/g, '') === class2Name.toLowerCase().replace(/\s+/g, '') ||
        (c.toLowerCase() + 's') === class2Name.toLowerCase() ||
        c.toLowerCase() === class2Name.toLowerCase().replace(/s$/, '')
      )
      
      console.log(`[v0] Association match: "${class1Name}" ${label} "${class2Name}" -> found: ${!!class1} & ${!!class2}`)
      
      if (class1 && class2 && class1 !== class2) {
        const key = `${class1}-${class2}-${label}`
        if (!relationshipSet.has(key)) {
          relationships.push({
            id: `rel-${relationships.length}`,
            fromClass: class1,
            toClass: class2,
            type: 'association',
            label: label,
            multiplicity: {
              from: '1',
              to: '*',
            },
          })
          relationshipSet.add(key)
          console.log(`[v0] Added relationship: ${class1} --${label}--> ${class2}`)
        }
      }
    }
  })

  const inheritancePatterns = [
    /(\w+)\s+is\s+(?:a|an)\s+(\w+)/gi,
    /(\w+)\s+extends\s+(\w+)/gi,
    /(\w+)\s+inherits\s+from\s+(\w+)/gi,
  ]

  inheritancePatterns.forEach((pattern) => {
    let match
    const regex = new RegExp(pattern.source, 'gi')
    while ((match = regex.exec(cleanedRequirement)) !== null) {
      const class1Name = match[1].trim().charAt(0).toUpperCase() + match[1].trim().slice(1)
      const class2Name = match[2].trim().charAt(0).toUpperCase() + match[2].trim().slice(1)
      
      const class1 = potentialClasses.find(c => c.toLowerCase() === class1Name.toLowerCase())
      const class2 = potentialClasses.find(c => c.toLowerCase() === class2Name.toLowerCase())
      
      if (class1 && class2 && class1 !== class2) {
        const key = `${class1}-${class2}-inheritance`
        if (!relationshipSet.has(key)) {
          relationships.push({
            id: `rel-${relationships.length}`,
            fromClass: class1,
            toClass: class2,
            type: 'inheritance',
            label: 'inherits',
          })
          relationshipSet.add(key)
        }
      }
    }
  })

  const compositionPatterns = [
    /(\w+)\s+has\s+(?:a|an|multiple)\s+(\w+)/gi,
    /(\w+)\s+owns\s+(?:a|an)?\s+(\w+)/gi,
    /(\w+)\s+contains\s+(?:a|an)?\s+(\w+)/gi,
  ]

  compositionPatterns.forEach((pattern) => {
    let match
    const regex = new RegExp(pattern.source, 'gi')
    while ((match = regex.exec(cleanedRequirement)) !== null) {
      const class1Name = match[1].trim().charAt(0).toUpperCase() + match[1].trim().slice(1)
      const class2Name = match[2].trim().charAt(0).toUpperCase() + match[2].trim().slice(1)
      
      const class1 = potentialClasses.find(c => c.toLowerCase() === class1Name.toLowerCase())
      const class2 = potentialClasses.find(c => c.toLowerCase() === class2Name.toLowerCase())
      
      if (class1 && class2 && class1 !== class2) {
        const key = `${class1}-${class2}-composition`
        if (!relationshipSet.has(key)) {
          relationships.push({
            id: `rel-${relationships.length}`,
            fromClass: class1,
            toClass: class2,
            type: 'composition',
            label: 'has',
          })
          relationshipSet.add(key)
        }
      }
    }
  })

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
