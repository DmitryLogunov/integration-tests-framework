Feature: Health Check
  In order to be able to check status of all
  system services \ gateways
  As a developer
  I want to send request to health check url
  for each service \ gateway

  Scenario Outline: init health-check
    When request health-check <service_name>

    Examples:
      | service_name           |
      | initiatorgateway       |
      | commandgateway         |
      | querygateway           |
      | config_service         |
  #  | servicescheduling |
      | usermanagement_service |
      | emailmanagement        |
      | soap_integrator        |
