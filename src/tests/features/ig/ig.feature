Feature: Initiator-gateway tests

  Scenario: Check requesting gateways
    When request gateways at ig

  Scenario: Request default app
    When request default app at ig

  Scenario: Check http://initiator-gateway-host/keycloak
    When inititor-gateway: check /keycloak
