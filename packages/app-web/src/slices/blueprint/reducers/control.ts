
import { BlueprintNodeId, BlueprintNodeType, BlueprintState } from '../types/blueprint'
import { ControlNodeState, ControlNodeChange } from '../types/control'
import { OperationNodeState, OperationState } from '../types/operation'
import { Rect } from '../../../lib/utils/2d'
import { addNode, nextNodeId } from './blueprint'
import { addVariable, propagateChange } from './variable'
import { arrayUniqueUnshift } from '../../../lib/utils/array'
import { availableValueTypes, castSerializedValue, compareSerializedValues, Control, createEmptyValue, identifySerializedValueType, serializeValue } from '@ciphereditor/library'
import { capitalCase } from 'change-case'
import { deriveUniqueName } from '../../../lib/utils/string'
import { getControlNode } from '../selectors/control'
import { getNode, getNodeChildren } from '../selectors/blueprint'
import { setOperationState } from './operation'

/**
 * Default control node object
 */
export const defaultControlNode: ControlNodeState = {
  id: -1,
  type: BlueprintNodeType.Control,
  parentId: -1,
  childIds: [],
  name: '',
  label: 'Control',
  description: undefined,
  types: availableValueTypes,
  value: serializeValue(createEmptyValue()),
  options: [],
  enforceOptions: true,
  visibility: 'collapsed',
  writable: true,
  maskPreview: false,
  order: 0
}

/**
 * Add an empty control to the given program node id.
 */
export const addControlNode = (
  state: BlueprintState,
  programId: BlueprintNodeId,
  frame: Rect,
  label?: string
): ControlNodeState => {
  const id = nextNodeId(state)

  // Choose unique control label
  const controls = getNodeChildren(state, programId, BlueprintNodeType.Control) as ControlNodeState[]
  const usedLabels = controls.map(control => control.label)
  const uniqueLabel = deriveUniqueName(label ?? defaultControlNode.label, usedLabels)

  const controlNode: ControlNodeState = {
    ...defaultControlNode,
    parentId: programId,
    id,
    name: `control${id}`,
    label: uniqueLabel,
    frame
  }
  return addNode(state, controlNode)
}

/**
 * Add a control to the given operation node id.
 * @param state Blueprint state
 * @param operationId Operation node id
 * @param control Control to be added
 * @returns New control node
 */
export const addOperationControlNode = (
  state: BlueprintState,
  operationId: BlueprintNodeId,
  control: Control
): ControlNodeState => {
  const value = control.value
  const options = control.options ?? []
  const index = options.findIndex(option =>
    compareSerializedValues(option.value, value))
  const selectedOptionIndex = index !== -1 ? index : undefined
  const controlNode: ControlNodeState = {
    ...defaultControlNode,
    ...control,
    id: nextNodeId(state),
    parentId: operationId,
    label: control.label ?? capitalCase(control.name),
    initialValue: value,
    value,
    selectedOptionIndex,
    options: options,
    visibility: control.visibility ?? defaultControlNode.visibility
  }
  return addNode(state, controlNode)
}

/**
 * Apply control changes originating from the user, an operation or a variable.
 */
export const changeControl = (
  state: BlueprintState,
  controlId: BlueprintNodeId,
  change: ControlNodeChange
): void => {
  const control = getControlNode(state, controlId)
  const oldValue = control.value
  const newValue = change.value !== undefined ? change.value : oldValue
  const equal: boolean = compareSerializedValues(oldValue, newValue)

  // Bail out early, if the value doesn't change
  if (equal) {
    return
  }

  // Update value
  control.value = newValue

  let operation: OperationNodeState
  const parent = getNode(state, control.parentId)
  const source = getNode(state, change.sourceNodeId)
  switch (parent.type) {
    case BlueprintNodeType.Operation: {
      operation = parent as OperationNodeState
      if (source.type !== BlueprintNodeType.Operation) {
        // Change is not originating from the operation, so mark it busy
        setOperationState(state, operation.id, OperationState.Busy)
        // Increment the request version every time a control changes
        if (operation.requestVersion !== undefined) {
          operation.requestVersion += 1
        }
        // Move the control id that was changed last to the head
        operation.priorityControlIds =
          arrayUniqueUnshift(operation.priorityControlIds, control.id)
      }
      if (source.type !== BlueprintNodeType.Variable) {
        propagateChange(state, control.id, parent.parentId)
      }
      break
    }
    case BlueprintNodeType.Program: {
      if (source.type === BlueprintNodeType.Variable) {
        if (source.id === control.attachedInternVariableId) {
          // Propagate change outside the program (if not root)
          if (state.rootProgramId !== parent.id) {
            propagateChange(state, control.id, parent.parentId)
          }
        } else {
          // Propagate change inside the program
          propagateChange(state, control.id, parent.id)
        }
      } else if (source.id === control.id) {
        propagateChange(state, control.id, parent.parentId)
        propagateChange(state, control.id, parent.id)
      }
      break
    }
  }
}

/**
 * Set a control value to the given choice index.
 */
export const changeControlValueToChoice = (
  state: BlueprintState,
  controlId: BlueprintNodeId,
  optionIndex: number
): void => {
  const control = getControlNode(state, controlId)
  const value = control.options[optionIndex].value
  changeControl(state, controlId, { sourceNodeId: control.id, value })
  control.selectedOptionIndex = optionIndex
}

/**
 * Change the type of a control value.
 */
export const changeControlValueToType = (
  state: BlueprintState,
  controlId: BlueprintNodeId,
  type: string
): void => {
  const control = getControlNode(state, controlId)
  control.selectedOptionIndex = undefined
  const valueType = identifySerializedValueType(control.value)
  if (valueType !== type) {
    let value = castSerializedValue(control.value, type)
    if (value === undefined) {
      value = serializeValue(createEmptyValue(type))
    }
    changeControl(state, controlId, { sourceNodeId: control.id, value })
  }
}

/**
 * Add a new variable from a control.
 */
export const addVariableFromControl = (
  state: BlueprintState,
  controlId: BlueprintNodeId,
  programId: BlueprintNodeId
): void => {
  // TODO: Detach currently attached variable
  addVariable(state, programId, controlId)
}
