#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <netinet/in.h>
#include <sys/select.h>

int serverSocket = -1, maxSockets = 0, next_id = 0;

int clients[65536], currentMessage[65536];

char bufferRead[4096 * 42], bufferWrite[4096 * 42 + 42], bufferWriteMessage[4096 * 42];

fd_set readSockets, writeSockets, activeSockets;

void sendMessage(int sender)
{
	for (int i = 0; i <= maxSockets; i++)
		if (FD_ISSET(i, &writeSockets) && i != sender)
			send(i, bufferWrite, strlen(bufferWrite), 0);
}

void fatal(void)
{
	write(2, "Fatal error\n", strlen("Fatal error\n"));
	close(serverSocket);
	exit(1);
}

int main(int argc, char **argv)
{
	if (argc != 2)
	{
		write(2, "Wrong number of arguments\n", strlen("Wrong number of arguments\n"));
		exit(1);
	}

	serverSocket = socket(AF_INET, SOCK_STREAM, 0);
	struct sockaddr_in serverAddr;
	socklen_t len;

	serverAddr.sin_family = AF_INET;
	serverAddr.sin_addr.s_addr = htonl(2130706433);  // 127.0.0.1 in network byte order
	serverAddr.sin_port = htons(atoi(argv[1]));

	if (serverSocket < 0)
		fatal();
	if ((bind(serverSocket, (const struct sockaddr *) &serverAddr, sizeof(serverAddr))) < 0)
		fatal();
	if (listen(serverSocket, 128) < 0)
		fatal();

	FD_ZERO(&activeSockets);
	FD_SET(serverSocket, &activeSockets);
	maxSockets = serverSocket;  // maxSockets = highest FD number we're monitoring
	bzero(clients, sizeof(clients));  // Clear the clients array
	bzero(currentMessage, sizeof(currentMessage));

	while (1)
	{
		readSockets = writeSockets = activeSockets;

		if (select(maxSockets + 1, &readSockets, &writeSockets, NULL, NULL) <= 0)
			continue;

		for(int socketId = 0; socketId <= maxSockets; socketId++)
		{
			if (FD_ISSET(socketId, &readSockets))
			{
				if (serverSocket == socketId)
				{
					int clientSocket = accept(serverSocket, (struct sockaddr *) &serverAddr, &len);
					if (clientSocket < 0)
						continue;

					FD_SET(clientSocket, &activeSockets);
					clients[clientSocket] = next_id++;  // Store client ID indexed by socket FD
					currentMessage[clientSocket] = 0;  // Fresh client, starting new message
					maxSockets = maxSockets < clientSocket ? clientSocket : maxSockets;
					
					sprintf(bufferWrite, "server: client %d just arrived\n", clientSocket);
					sendMessage(clientSocket);  // Send to all EXCEPT the new client
					break;
				}
				else
				{
					int bytesRead = recv(socketId, bufferRead, 4096 * 42, 0);

					if (bytesRead <= 0)
					{
						sprintf(bufferWrite, "server: client %d just left\n", clients[socketId]);
						sendMessage(socketId);
						close(socketId);
						FD_CLR(socketId, &activeSockets);  // Remove from active set
						break;
					}
					else
					{
						for(int i = 0, j = 0; i < bytesRead; i++, j++)
						{
							bufferWriteMessage[j] = bufferRead[i];

							if (bufferWriteMessage[j] == '\n')
							{
								bufferWriteMessage[j + 1] = '\0';

								if (currentMessage[socketId])
									sprintf(bufferWrite, "%s", bufferWriteMessage);
								else
									sprintf(bufferWrite, "client %d: %s", clients[socketId], bufferWriteMessage);
								
								currentMessage[socketId] = 0;  // Next message will be a fresh start
								j = -1;  // Reset j for next line
								sendMessage(socketId);
							}
							else if (i == (bytesRead - 1))
							{
								bufferWriteMessage[j + 1] = '\0';
								
								if (currentMessage[socketId])
									sprintf(bufferWrite, "%s", bufferWriteMessage);
								else
									sprintf(bufferWrite, "client %d: %s", clients[socketId], bufferWriteMessage);
								
								currentMessage[socketId] = 1;  // Mark as partial - next data is continuation
								sendMessage(socketId);
								break;
							}
						}
					}
				}
			}
		}
	}
}