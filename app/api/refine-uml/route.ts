import type { UMLModel } from '@/app/page'

function generateRefinementResponse(
  currentModel: UMLModel,
  userFeedback: string,
  conversationHistory: Array<{ role: string; content: string }>
) {
  const feedback = userFeedback.toLowerCase()
  let updatedModel: UMLModel | undefined
  let message = ''
  const clarifications: string[] = []

  if (feedback.includes('add') && feedback.includes('class')) {
    const classNameMatch = feedback.match(/(?:add|create)\s+(?:a\s+)?(?:new\s+)?(\w+)\s+class/i)
    if (classNameMatch) {
      const newClassName = classNameMatch[1].charAt(0).toUpperCase() + classNameMatch[1].slice(1)
      const existingClass = currentModel.classes.find(c => c.name.toLowerCase() === newClassName.toLowerCase())
      
      if (!existingClass) {
        updatedModel = JSON.parse(JSON.stringify(currentModel))
        const newId = `class-${updatedModel.classes.length}`
        updatedModel.classes.push({
          id: newId,
          name: newClassName,
          attributes: [],
          methods: [],
        })
        message = `Added new class "${newClassName}" to your model. You now have ${updatedModel.classes.length} classes.`
      } else {
        message = `The class "${newClassName}" already exists in your model.`
      }
    }
  }

  if (!updatedModel && feedback.includes('to') && currentModel.classes.length > 0) {
    // Pattern: "add Email class to Order" or "Email belongs to Order" or "Order has Email"
    const allClassNames = currentModel.classes.map(c => c.name)
    
    // Try to find two class names in the feedback
    let class1: string | undefined
    let class2: string | undefined
    
    for (const className of allClassNames) {
      if (feedback.includes(className.toLowerCase())) {
        if (!class1) {
          class1 = className
        } else if (!class2) {
          class2 = className
          break
        }
      }
    }

    if (class1 && class2) {
      updatedModel = JSON.parse(JSON.stringify(currentModel))
      
      // Check if relationship already exists
      const existingRel = updatedModel.relationships.find(
        r => (r.fromClass === class1 && r.toClass === class2) || (r.fromClass === class2 && r.toClass === class1)
      )

      if (!existingRel) {
        // Determine relationship type from keywords
        let relType = 'association'
        if (feedback.includes('inherit') || feedback.includes('extends') || feedback.includes('is a')) {
          relType = 'inheritance'
        } else if (feedback.includes('composition') || feedback.includes('owns') || feedback.includes('contains')) {
          relType = 'composition'
        } else if (feedback.includes('aggregation') || feedback.includes('has-a') || feedback.includes('part of')) {
          relType = 'aggregation'
        } else if (feedback.includes('depends') || feedback.includes('dependency')) {
          relType = 'dependency'
        }

        // Determine direction
        let fromClass = class1
        let toClass = class2
        
        // "to Order" or "belongs to Order" means points to Order
        if (feedback.includes(`to ${class2.toLowerCase()}`)) {
          fromClass = class1
          toClass = class2
        } else if (feedback.includes(`to ${class1.toLowerCase()}`)) {
          fromClass = class2
          toClass = class1
        }

        updatedModel.relationships.push({
          id: `rel-${updatedModel.relationships.length}`,
          fromClass,
          toClass,
          type: relType,
          label: '',
        })

        message = `Added ${relType} relationship: ${fromClass} → ${toClass}. Your model now has ${updatedModel.relationships.length} relationships.`
      } else {
        message = `A relationship between ${class1} and ${class2} already exists.`
      }
    }
  }

  // Check if user wants to change relationship types
  if (!updatedModel && (feedback.includes('change') || feedback.includes('update') || feedback.includes('modify'))) {
    // Look for specific class names mentioned
    const classNames = currentModel.classes.map(c => c.name)
    const mentionedClasses = classNames.filter(name => feedback.includes(name.toLowerCase()))

    if (mentionedClasses.length >= 2 && (feedback.includes('inherit') || feedback.includes('extends'))) {
      // Change to inheritance
      const [from, to] = mentionedClasses
      updatedModel = JSON.parse(JSON.stringify(currentModel))
      const rel = updatedModel.relationships.find(
        r => (r.fromClass === from && r.toClass === to) || (r.fromClass === to && r.toClass === from)
      )
      if (rel) {
        rel.type = 'inheritance'
        message = `Updated the relationship between ${from} and ${to} to inheritance (is-a relationship). ${from} now extends ${to}.`
      }
    } else if (mentionedClasses.length >= 2 && (feedback.includes('composition') || feedback.includes('owns') || feedback.includes('contains'))) {
      // Change to composition
      const [from, to] = mentionedClasses
      updatedModel = JSON.parse(JSON.stringify(currentModel))
      const rel = updatedModel.relationships.find(
        r => (r.fromClass === from && r.toClass === to) || (r.fromClass === to && r.toClass === from)
      )
      if (rel) {
        rel.type = 'composition'
        rel.fromClass = from
        rel.toClass = to
        message = `Updated the relationship between ${from} and ${to} to composition. ${from} now owns ${to} (strong ownership).`
      }
    } else if (mentionedClasses.length >= 2 && (feedback.includes('aggregation') || feedback.includes('has') || feedback.includes('part of'))) {
      // Change to aggregation
      const [from, to] = mentionedClasses
      updatedModel = JSON.parse(JSON.stringify(currentModel))
      const rel = updatedModel.relationships.find(
        r => (r.fromClass === from && r.toClass === to) || (r.fromClass === to && r.toClass === from)
      )
      if (rel) {
        rel.type = 'aggregation'
        rel.fromClass = from
        rel.toClass = to
        message = `Updated the relationship between ${from} and ${to} to aggregation. ${from} has ${to} (weak ownership).`
      }
    }
  }

  // If no update was made, provide helpful conversational response
  if (!updatedModel) {
    if (feedback.includes('relationship') || feedback.includes('relation')) {
      message = `I can help you refine the relationships in your UML diagram. Currently, you have ${currentModel.relationships.length} relationships defined.`
      clarifications.push('Which relationship would you like to change?')
      clarifications.push('Would you like to change it to inheritance, composition, aggregation, or association?')
    } else if (feedback.includes('class') || feedback.includes('attribute') || feedback.includes('method')) {
      message = `You currently have ${currentModel.classes.length} classes in your model.`
      if (currentModel.classes.length > 0) {
        message += ` Here they are: ${currentModel.classes.map(c => c.name).join(', ')}.`
      }
      clarifications.push('Would you like to add, remove, or modify any classes?')
    } else if (feedback.includes('correct') || feedback.includes('looks good') || feedback.includes('perfect')) {
      message = `Great! Your UML diagram looks solid with ${currentModel.classes.length} classes and ${currentModel.relationships.length} relationships. Is there anything else you'd like to adjust?`
    } else if (feedback.includes('what') || feedback.includes('explain') || feedback.includes('help')) {
      message = `I'm here to help refine your UML model. You can ask me to:
- Change relationship types (inheritance, composition, aggregation, association, dependency)
- Explain the differences between relationship types
- Validate if the current model matches your requirements
- Add or remove classes if needed

What would you like to do?`
    } else {
      message = `I understand you want to work on: "${userFeedback}". Could you be more specific about which classes or relationships you'd like to modify?`
      clarifications.push('Which classes are involved?')
      clarifications.push('What type of change would you like to make?')
    }
  }

  return {
    message: message || 'How would you like to refine your UML model?',
    updatedModel,
    clarifications: clarifications.length > 0 ? clarifications : undefined,
  }
}

export async function POST(request: Request) {
  try {
    const { currentModel, userFeedback, conversationHistory } = await request.json() as {
      currentModel: UMLModel
      userFeedback: string
      conversationHistory: Array<{ role: string; content: string }>
    }

    if (!currentModel || !userFeedback) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const response = generateRefinementResponse(currentModel, userFeedback, conversationHistory)
    return Response.json(response)
  } catch (error) {
    console.error('Refinement error:', error)
    return Response.json({ error: 'Failed to process refinement' }, { status: 500 })
  }
}
