
import { SerializedValue } from '@ciphereditor/library'
import {
  BlueprintNodeId,
  BlueprintNodeType,
  BlueprintState
} from '../types/blueprint'
import { ControlNodeState } from '../types/control'
import { VariableNodeState } from '../types/variable'
import { getNode, getNodeChildren } from './blueprint'
import { getControlNode, isControlInternVariable } from './control'

/**
 * Find a variable node by the given node id.
 * @param state Blueprint state
 * @param id Node id
 * @throws If the blueprint has no node with the given id
 * @throws If the node type does not match the expected type
 * @returns Variable node
 */
export const getVariableNode = (state: BlueprintState, id: BlueprintNodeId): VariableNodeState =>
  getNode(state, id, BlueprintNodeType.Variable) as VariableNodeState

/**
 * Return the variable currently attached to the given control within a program
 * context. By default, the active program context is used.
 */
export const getControlVariable = (
  state: BlueprintState,
  controlId: BlueprintNodeId,
  programId?: BlueprintNodeId
): VariableNodeState | undefined => {
  const intern = isControlInternVariable(state, controlId, programId)
  const control = getControlNode(state, controlId)
  const variableId = intern ? control.attachedInternVariableId : control.attachedVariableId
  return variableId !== undefined ? getVariableNode(state, variableId) : undefined
}

/**
 * Return variables from the given program.
 */
export const getProgramVariables = (state: BlueprintState, programId: BlueprintNodeId): VariableNodeState[] =>
  getNodeChildren(state, programId, BlueprintNodeType.Variable) as VariableNodeState[]

/**
 * Return the control that last propagated to a given variable.
 */
export const getVariableControl = (
  state: BlueprintState,
  variableId: BlueprintNodeId
): ControlNodeState => {
  const variable = getVariableNode(state, variableId)
  // Assertion: Variable attachment ids are ordered by when they propagated
  if (variable.attachmentIds.length === 0) {
    throw new Error('Assertion failed: A variable is always attached to at least one control')
  }
  return getControlNode(state, variable.attachmentIds[0])
}

/**
 * Return all control nodes attached to a given variable.
 */
export const getVariableAttachedControls = (
  state: BlueprintState,
  variableId: BlueprintNodeId
): ControlNodeState[] =>
  getVariableNode(state, variableId)
    .attachmentIds
    .map(controlId => getControlNode(state, controlId))

/**
 * Return the current value for the given variable.
 */
export const getVariableValue = (state: BlueprintState, variableId: BlueprintNodeId): SerializedValue =>
  getVariableControl(state, variableId).value

/**
 * Return wire waypoints and their respective node rects for the given variable.
 */
export const getVariableWireWaypoints = (state: BlueprintState, variableId: BlueprintNodeId): Array<{
  push: boolean
  x: number
  y: number
  nodeX: number
  nodeY: number
  nodeWidth: number
  nodeHeight: number
}> => {
  const variable = getVariableNode(state, variableId)
  const contextProgramId = variable.parentId
  const waypoints: Array<{
    push: boolean
    x: number
    y: number
    nodeX: number
    nodeY: number
    nodeWidth: number
    nodeHeight: number
  }> = []

  for (let i = 0; i < variable.attachmentIds.length; i++) {
    const control = getControlNode(state, variable.attachmentIds[i])
    const node =
      control.parentId === contextProgramId
        ? control
        : getNode(state, control.parentId)

    if (
      node.frame !== undefined &&
      control.nodeOutletX !== undefined &&
      control.nodeOutletY !== undefined
    ) {
      waypoints.push({
        push: i === 0,
        x: node.frame.x + control.nodeOutletX,
        y: node.frame.y + control.nodeOutletY,
        nodeX: node.frame.x,
        nodeY: node.frame.y,
        nodeWidth: node.frame.width,
        nodeHeight: node.frame.height
      })
    }
  }

  return waypoints
}
