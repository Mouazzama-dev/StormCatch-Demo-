const baseUrl = ''

const elements = {
  clientSecret:
    document.querySelector('#clientSecret'),
  action:
    document.querySelector('#action'),
  startButton:
    document.querySelector('#startButton'),
  resetButton:
    document.querySelector('#resetButton'),
  formMessage:
    document.querySelector('#formMessage'),
  storyStatus:
    document.querySelector('#storyStatus'),
  storyTimeline:
    document.querySelector('#storyTimeline'),

  identityPanel:
    document.querySelector('#identityPanel'),
  robotDidValue:
    document.querySelector('#robotDidValue'),
  credentialTypeValue:
    document.querySelector('#credentialTypeValue'),
  credentialIssuerValue:
    document.querySelector('#credentialIssuerValue'),
  credentialSubjectValue:
    document.querySelector('#credentialSubjectValue'),
  credentialHashValue:
    document.querySelector('#credentialHashValue'),

  challengePanel:
    document.querySelector('#challengePanel'),
  requestIdValue:
    document.querySelector('#requestIdValue'),
  challengeValue:
    document.querySelector('#challengeValue'),
  challengeDomainValue:
    document.querySelector('#challengeDomainValue'),
  challengeExpiresValue:
    document.querySelector('#challengeExpiresValue'),

  decisionPanel:
    document.querySelector('#decisionPanel'),
  decisionValue:
    document.querySelector('#decisionValue'),
  decisionReason:
    document.querySelector('#decisionReason'),
  resourceValue:
    document.querySelector('#resourceValue'),
  actionValue:
    document.querySelector('#actionValue'),
  policyIdValue:
    document.querySelector('#policyIdValue'),

  proofPanel:
    document.querySelector('#proofPanel'),
  eventIdValue:
    document.querySelector('#eventIdValue'),
  auditHashValue:
    document.querySelector('#auditHashValue'),
  ipfsCidValue:
    document.querySelector('#ipfsCidValue'),
  contractAddressValue:
    document.querySelector('#contractAddressValue'),
  transactionHashValue:
    document.querySelector('#transactionHashValue'),
  blockNumberValue:
    document.querySelector('#blockNumberValue'),
  gasUsedValue:
    document.querySelector('#gasUsedValue'),

  technicalOutput:
    document.querySelector('#technicalOutput'),
}

const conversationDelay = 1400

const sleep = (milliseconds) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })

const requestJson = async (
  path,
  options = {},
) => {
  const response = await fetch(
    `${baseUrl}${path}`,
    options,
  )

  const contentType =
    response.headers.get('content-type') ?? ''

  const body = contentType.includes(
    'application/json',
  )
    ? await response.json()
    : {
        message: await response.text(),
      }

  if (!response.ok) {
    const message =
      body.message ??
      body.error ??
      `Request failed with status ${response.status}`

    throw new Error(message)
  }

  return body
}

const createHeaders = (
  accessToken,
) => ({
  authorization: `Bearer ${accessToken}`,
  'content-type': 'application/json',
})

const getActionLabel = (
  action,
) => {
  if (action === 'scan-inventory') {
    return 'scan the inventory inside warehouse-zone-a'
  }

  if (action === 'move-container') {
    return 'move a container inside warehouse-zone-a'
  }

  return action
}

const formatDate = (
  value,
) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

const addConversationMessage = ({
  speaker,
  title,
  description,
  role = 'system',
  state = '',
}) => {
  const item =
    document.createElement('li')

  const classNames = [
    'story-step',
    `${role}-message`,
    state,
  ].filter(Boolean)

  item.className =
    classNames.join(' ')

  const speakerElement =
    document.createElement('div')

  speakerElement.className =
    'message-speaker'

  speakerElement.textContent =
    speaker

  const titleElement =
    document.createElement('strong')

  titleElement.textContent =
    title

  const descriptionElement =
    document.createElement('p')

  descriptionElement.textContent =
    description

  item.append(
    speakerElement,
    titleElement,
    descriptionElement,
  )

  elements.storyTimeline.append(item)

  item.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  })
}

const resetValue = (
  element,
) => {
  element.textContent = '—'
}

const resetOutput = () => {
  elements.formMessage.textContent = ''
  elements.formMessage.className = 'message'

  elements.storyStatus.textContent =
    'Not started'

  elements.storyTimeline.innerHTML = `
    <li class="story-step gateway-message">
      <div class="message-speaker">
        Authorization Gateway
      </div>

      <strong>
        Waiting for a Robot request
      </strong>

      <p>
        Begin the story to start the warehouse
        authorization conversation.
      </p>
    </li>
  `

  elements.identityPanel.hidden = true
  elements.challengePanel.hidden = true
  elements.decisionPanel.hidden = true
  elements.proofPanel.hidden = true

  elements.decisionPanel.className =
    'decision-panel'

  resetValue(elements.robotDidValue)
  resetValue(elements.credentialTypeValue)
  resetValue(elements.credentialIssuerValue)
  resetValue(elements.credentialSubjectValue)
  resetValue(elements.credentialHashValue)

  resetValue(elements.requestIdValue)
  resetValue(elements.challengeValue)
  resetValue(elements.challengeDomainValue)
  resetValue(elements.challengeExpiresValue)

  resetValue(elements.decisionValue)
  resetValue(elements.decisionReason)
  elements.resourceValue.textContent =
    'warehouse-zone-a'
  resetValue(elements.actionValue)
  resetValue(elements.policyIdValue)

  resetValue(elements.eventIdValue)
  resetValue(elements.auditHashValue)
  resetValue(elements.ipfsCidValue)
  resetValue(elements.contractAddressValue)
  resetValue(elements.transactionHashValue)
  resetValue(elements.blockNumberValue)
  resetValue(elements.gasUsedValue)

  elements.technicalOutput.textContent =
    'No response yet.'
}

const setRunningState = (
  isRunning,
) => {
  elements.startButton.disabled = isRunning
  elements.clientSecret.disabled = isRunning
  elements.action.disabled = isRunning

  elements.startButton.textContent =
    isRunning
      ? 'Story in progress...'
      : 'Begin Authorization Story'
}

const showRobotEvidence = (
  robot,
) => {
  elements.identityPanel.hidden = false

  elements.robotDidValue.textContent =
    robot.robot.did

  elements.credentialTypeValue.textContent =
    robot.credential.type

  elements.credentialIssuerValue.textContent =
    robot.credential.issuerDid

  elements.credentialSubjectValue.textContent =
    robot.credential.subjectDid

  elements.credentialHashValue.textContent =
    robot.credential.hash
}

const showChallenge = (
  challenge,
) => {
  elements.challengePanel.hidden = false

  elements.requestIdValue.textContent =
    challenge.requestId

  elements.challengeValue.textContent =
    challenge.challenge

  elements.challengeDomainValue.textContent =
    challenge.domain

  elements.challengeExpiresValue.textContent =
    formatDate(challenge.expiresAt)
}

const showDecision = (
  authorization,
  requestedAction,
) => {
  const approved =
    authorization.decision === 'APPROVE'

  elements.decisionPanel.hidden = false

  elements.decisionPanel.className =
    approved
      ? 'decision-panel approved'
      : 'decision-panel rejected'

  elements.decisionValue.textContent =
    authorization.decision

  elements.decisionReason.textContent =
    authorization.details ??
    authorization.reason

  elements.resourceValue.textContent =
    authorization.resource

  elements.actionValue.textContent =
    requestedAction

  elements.policyIdValue.textContent =
    authorization.policy?.id ??
    'No policy evidence returned'
}

const showLocalAuditProof = (
  authorization,
  auditRecord,
) => {
  elements.proofPanel.hidden = false

  elements.eventIdValue.textContent =
    authorization.eventId

  elements.auditHashValue.textContent =
    auditRecord?.hash ??
    'Audit hash unavailable'
}

const showIpfsProof = (
  proof,
) => {
  elements.ipfsCidValue.textContent =
    proof?.cid ??
    'IPFS proof unavailable'
}

const showBlockchainProof = (
  proof,
) => {
  if (!proof) {
    return
  }

  elements.contractAddressValue.textContent =
    proof.contractAddress

  elements.transactionHashValue.textContent =
    proof.transactionHash ??
    'Already anchored'

  elements.blockNumberValue.textContent =
    proof.blockNumber?.toString() ??
    'Already anchored'

  elements.gasUsedValue.textContent =
    proof.gasUsed ??
    'Already anchored'

  if (proof.auditHash) {
    elements.auditHashValue.textContent =
      proof.auditHash
  }
}

const runDemo = async () => {
  const clientSecret =
    elements.clientSecret.value.trim()

  const requestedAction =
    elements.action.value

  if (!clientSecret) {
    elements.formMessage.textContent =
      'Demo client secret is required.'

    elements.formMessage.className =
      'message error'

    return
  }

  resetOutput()
  setRunningState(true)

  elements.resetButton.disabled = true
  elements.storyTimeline.innerHTML = ''
  elements.storyStatus.textContent =
    'Connecting'

  const technicalResult = {}

  try {
    const token =
      await requestJson(
        '/api/v1/auth/token',
        {
          method: 'POST',
          headers: {
            'content-type':
              'application/json',
          },
          body: JSON.stringify({
            clientId:
              'robot-demo-client',
            clientSecret,
          }),
        },
      )

    technicalResult.authentication = {
      tokenType: token.tokenType,
      expiresIn: token.expiresIn,
      scope: token.scope,
    }

    const headers =
      createHeaders(
        token.accessToken,
      )

    addConversationMessage({
      speaker: 'StormCatch System',
      title: 'Secure API session established',
      description:
        'The demo client received a short-lived scoped access token.',
      role: 'system',
      state: 'success',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Authorization Gateway',
      title: 'Who are you?',
      description:
        'Identify yourself before requesting access to warehouse-zone-a.',
      role: 'gateway',
    })

    await sleep(conversationDelay)

    const robot =
      await requestJson(
        '/api/v1/demo/robot',
        {
          headers,
        },
      )

    technicalResult.robot = robot

    showRobotEvidence(robot)

    addConversationMessage({
      speaker: 'Warehouse Robot',
      title: `I am ${robot.robot.id}`,
      description:
        `I am a ${robot.robot.model} manufactured by ${robot.robot.manufacturer}. My decentralized identity is ${robot.robot.did}.`,
      role: 'robot',
      state: 'success',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Authorization Gateway',
      title: 'Do you have a trusted identity credential?',
      description:
        'A DID alone identifies you, but I also need trusted evidence about your identity and capabilities.',
      role: 'gateway',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Warehouse Robot',
      title: 'Yes. I have an  Identity Credential.',
      description:
        `It was issued by ${robot.credential.issuerDid}. Its subject is my Robot DID, and its registered capabilities are: ${robot.robot.capabilities.join(', ')}.`,
      role: 'robot',
      state: 'success',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Authorization Gateway',
      title: 'Prove that the credential belongs to you.',
      description:
        'I will issue a fresh one-time challenge. Your signed presentation must contain this challenge.',
      role: 'gateway',
    })

    const challenge =
      await requestJson(
        '/api/v1/authorization/challenges',
        {
          method: 'POST',
          headers,
        },
      )

    technicalResult.challenge = challenge

    showChallenge(challenge)

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Authorization Gateway',
      title: 'One-time challenge issued',
      description:
        `Request ${challenge.requestId} is valid for domain ${challenge.domain} until ${formatDate(challenge.expiresAt)}.`,
      role: 'gateway',
      state: 'success',
    })

    const presentation =
      await requestJson(
        '/api/v1/demo/robot/presentations',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            requestId:
              challenge.requestId,
          }),
        },
      )

    technicalResult.presentation = {
      requestId:
        presentation.requestId,
      actorDid:
        presentation.actorDid,
      credentialHash:
        presentation.credentialHash,
      holder:
        presentation.presentation?.holder,
    }

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Warehouse Robot',
      title: 'Signed Verifiable Presentation submitted',
      description:
        'I signed a presentation containing my AI Identity Credential and your fresh challenge.',
      role: 'robot',
      state: 'success',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Authorization Gateway',
      title: 'What action are you requesting?',
      description:
        'State the resource and action you want the policy engine to evaluate.',
      role: 'gateway',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Warehouse Robot',
      title: 'Authorization request',
      description:
        `I request permission to ${getActionLabel(requestedAction)}.`,
      role: 'robot',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Verification Service',
      title: 'Verifying Robot evidence',
      description:
        'Checking the presentation signature, credential issuer, subject DID, domain and one-time challenge.',
      role: 'system',
    })

    const authorization =
      await requestJson(
        '/api/v1/authorization/requests',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            requestId:
              challenge.requestId,
            actorDid:
              presentation.actorDid,
            resource:
              'warehouse-zone-a',
            action:
              requestedAction,
            presentation:
              presentation.presentation,
          }),
        },
      )

    technicalResult.authorization =
      authorization

    showDecision(
      authorization,
      requestedAction,
    )

    await sleep(conversationDelay)

    const verification =
      authorization.verification

    addConversationMessage({
      speaker: 'Verification Service',
      title: verification.presentationVerified
        ? 'Identity evidence verified'
        : 'Identity evidence rejected',
      description:
        `Presentation verified: ${verification.presentationVerified}. Credential verified: ${verification.credentialVerified}. Challenge consumed: ${verification.challengeConsumed}.`,
      role: 'system',
      state: verification.presentationVerified
        ? 'success'
        : 'failure',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Warehouse Policy Engine',
      title:
        `Decision: ${authorization.decision}`,
      description:
        authorization.details ??
        authorization.reason,
      role: 'policy',
      state:
        authorization.decision === 'APPROVE'
          ? 'success'
          : 'failure',
    })

    const auditDetails =
      await requestJson(
        `/api/v1/audits/${challenge.requestId}`,
        {
          headers,
        },
      )

    const auditRecord =
      auditDetails.auditRecords.find(
        (record) =>
          record.eventId ===
          authorization.eventId,
      ) ??
      auditDetails.auditRecords.at(-1)

    technicalResult.audit = {
      eventId:
        authorization.eventId,
      auditRecord,
    }

    showLocalAuditProof(
      authorization,
      auditRecord,
    )

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Audit Service',
      title: 'Decision written to the audit log',
      description:
        `Event ${authorization.eventId} was stored in the append-only JSONL log and hashed using SHA-256.`,
      role: 'audit',
      state: 'success',
    })

    const ipfsResult =
      await requestJson(
        `/api/v1/audits/${challenge.requestId}/publish`,
        {
          method: 'POST',
          headers,
        },
      )

    const ipfsProof =
      ipfsResult.proofs.find(
        (proof) =>
          proof.eventId ===
          authorization.eventId,
      ) ??
      ipfsResult.proofs.at(-1)

    technicalResult.ipfs = {
      uploadedCount:
        ipfsResult.uploadedCount,
      existingCount:
        ipfsResult.existingCount,
      proof: ipfsProof,
    }

    showIpfsProof(ipfsProof)

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'IPFS Service',
      title: ipfsResult.uploadedCount > 0
        ? 'Audit proof published to IPFS'
        : 'Existing IPFS proof found',
      description:
        `The complete audit proof is available under CID ${ipfsProof?.cid ?? 'unavailable'}.`,
      role: 'audit',
      state: 'success',
    })

    const blockchainResult =
      await requestJson(
        `/api/v1/audits/${challenge.requestId}/anchor`,
        {
          method: 'POST',
          headers,
        },
      )

    const blockchainProof =
      blockchainResult.proofs.find(
        (proof) =>
          proof.eventId ===
          authorization.eventId,
      ) ??
      blockchainResult.proofs.at(-1)

    technicalResult.blockchain = {
      anchoredCount:
        blockchainResult.anchoredCount,
      existingCount:
        blockchainResult.existingCount,
      proof:
        blockchainProof,
    }

    showBlockchainProof(
      blockchainProof,
    )

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Sepolia Blockchain',
      title:
        blockchainResult.anchoredCount > 0
          ? 'Audit proof anchored'
          : 'Audit proof already anchored',
      description:
        blockchainProof?.transactionHash
          ? `Transaction ${blockchainProof.transactionHash} confirms the audit hash and IPFS CID on block ${blockchainProof.blockNumber}.`
          : 'The smart contract confirms that this event was already anchored.',
      role: 'blockchain',
      state: 'success',
    })

    await sleep(conversationDelay)

    addConversationMessage({
      speaker: 'Authorization Gateway',
      title: 'Authorization story completed',
      description:
        `The ${authorization.decision} decision is now recorded with a local audit event, IPFS CID and Sepolia blockchain proof.`,
      role: 'gateway',
      state:
        authorization.decision === 'APPROVE'
          ? 'success'
          : 'failure',
    })

    elements.storyStatus.textContent =
      'Completed'

    elements.formMessage.textContent =
      `${authorization.decision} decision completed and anchored successfully.`

    elements.technicalOutput.textContent =
      JSON.stringify(
        technicalResult,
        null,
        2,
      )
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected demo error'

    elements.storyStatus.textContent =
      'Failed'

    elements.formMessage.textContent =
      message

    elements.formMessage.className =
      'message error'

    addConversationMessage({
      speaker: 'StormCatch System',
      title: 'Scenario stopped',
      description: message,
      role: 'system',
      state: 'failure',
    })

    elements.technicalOutput.textContent =
      JSON.stringify(
        {
          ...technicalResult,
          error: message,
        },
        null,
        2,
      )
  } finally {
    setRunningState(false)
    elements.resetButton.disabled = false
  }
}

elements.startButton.addEventListener(
  'click',
  () => {
    void runDemo()
  },
)

elements.resetButton.addEventListener(
  'click',
  () => {
    resetOutput()
    elements.resetButton.disabled = true
  },
)

resetOutput()