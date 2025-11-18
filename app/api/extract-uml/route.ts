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
  const nounPattern = /\b[A-Z][a-zA-Z]*\b/g
  const potentialClasses = [...new Set(requirement.match(nounPattern) || [])]
    .filter(word => word.length > 2 && !['The', 'This', 'That', 'Has', 'Is', 'Are', 'A', 'An', 'But', 'Or', 'And', 'With'].includes(word))

  // Common attributes based on keywords
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
  }

  // Common methods based on class name
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
  }

  const relationships: any[] = []
  const lowerReq = requirement.toLowerCase()

  // Build relationships based on explicit text patterns
  const relationshipSet = new Set<string>()

  // More specific relationship detection
  const inheritanceMatch = lowerReq.match(/(\w+)\s+is\s+a(?:n)?\s+(\w+)/gi) || []
  inheritanceMatch.forEach((match) => {
    const parts = match.split(/\s+is\s+a(?:n)?\s+/i)
    if (parts.length === 2) {
      const class1 = potentialClasses.find(c => c.toLowerCase() === parts[0].toLowerCase())
      const class2 = potentialClasses.find(c => c.toLowerCase() === parts[1].toLowerCase())
      if (class1 && class2 && class1 !== class2) {
        const key = `${class1}-${class2}-inheritance`
        if (!relationshipSet.has(key)) {
          relationships.push({
            id: `rel-${relationships.length}`,
            fromClass: class1,
            toClass: class2,
            type: 'inheritance',
          })
          relationshipSet.add(key)
        }
      }
    }
  })

  // Composition patterns (has a)
  const compositionMatch = lowerReq.match(/(\w+)\s+has\s+a(?:n)?\s+(\w+)/gi) || []
  compositionMatch.forEach((match) => {
    const parts = match.split(/\s+has\s+a(?:n)?\s+/i)
    if (parts.length === 2) {
      const class1 = potentialClasses.find(c => c.toLowerCase() === parts[0].toLowerCase())
      const class2 = potentialClasses.find(c => c.toLowerCase() === parts[1].toLowerCase())
      if (class1 && class2 && class1 !== class2) {
        const key = `${class1}-${class2}-composition`
        if (!relationshipSet.has(key)) {
          relationships.push({
            id: `rel-${relationships.length}`,
            fromClass: class1,
            toClass: class2,
            type: 'composition',
          })
          relationshipSet.add(key)
        }
      }
    }
  })

  // Association patterns (contains, belongs to, associated with)
  const associationPatterns = [
    { regex: /(\w+)\s+contains\s+(?:a\s+)?(\w+)/gi, label: 'contains' },
    { regex: /(\w+)\s+belongs\s+to\s+(?:a\s+)?(\w+)/gi, label: 'belongs to' },
  ]

  associationPatterns.forEach(({ regex }) => {
    const tempRegex = new RegExp(regex.source, 'gi')
    let match
    while ((match = tempRegex.exec(requirement)) !== null) {
      const class1 = potentialClasses.find(c => c.toLowerCase() === match[1].toLowerCase())
      const class2 = potentialClasses.find(c => c.toLowerCase() === match[2].toLowerCase())
      if (class1 && class2 && class1 !== class2) {
        const key = `${class1}-${class2}-association`
        if (!relationshipSet.has(key)) {
          relationships.push({
            id: `rel-${relationships.length}`,
            fromClass: class1,
            toClass: class2,
            type: 'association',
          })
          relationshipSet.add(key)
        }
      }
    }
  })

  // Removed the old pattern based relationship detection
  // Moved the old relationship detection logic to the bottom

  // Build class objects
  const classes = potentialClasses.map((className, index) => ({
    id: `class-${index}`,
    name: className,
    attributes: (attributeMap[className] || []).map((attr, idx) => ({
      id: `attr-${index}-${idx}`,
      name: attr,
      type: attr === 'id' || attr === 'password' ? 'string' : attr.includes('price') || attr.includes('salary') || attr.includes('balance') ? 'number' : 'string',
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
