#include <errno.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <netinet/in.h>
#include <netdb.h>

typedef struct S_client {
	int id;
	char msg[1024];
}	t_client;

t_client clients[1024];
int maxfd = 0;
int globalid = 0;
char sendbuff[120000];
char recvbuff[120000];
fd_set writefds, readfds, currfds;

void err(char *msg) {
	if(msg) {
		write(2, msg, strlen(msg));
	} else {
		write(2, "Fatal error", 11);
	}
	write(2, "\n", 1);
	exit(1);
}

void broadcast(int outer) {
	for(int fd = 0; fd <= maxfd; fd++) {
		if(FD_ISSET(fd, &writefds) && fd != outer) {
			send(fd, &sendbuff, sizeof(sendbuff), 0);
		}
	}
}

int main(int argc, char **argv) {
	if(argc != 2) {
		err("Wrong number of arguments");
	}

	struct sockaddr_in server;
	socklen_t len;
	int serverfd = socket(AF_INET, SOCK_STREAM, 0);
	if(serverfd < 0) {
		err(NULL);
	}
	maxfd = serverfd;

	FD_ZERO(&currfds);
	FD_SET(serverfd, &currfds);
	bzero(clients, sizeof(clients));
	bzero(&server, sizeof(server));

	server.sin_port = htons(atoi(argv[1]));
	server.sin_family = AF_INET;
	server.sin_addr.s_addr = htonl(2130706433);

	if(bind(serverfd, (const struct sockaddr *)&server, sizeof(server)) < 0) {
		err(NULL);
	}
	if(listen(serverfd, 10) < 0) {
		err(NULL);
	}
	
	while(1) {
		writefds = readfds = currfds;
		if(select(maxfd + 1, &readfds, &writefds, NULL, NULL) < 0) {
			continue;
		}

		for(int fd = 0; fd <= maxfd; fd++) {
			if(FD_ISSET(fd, &readfds) && fd == serverfd) {
				int clientfd = accept(fd, (struct sockaddr *)&server, &len);
				if(clientfd < 0) {
					continue;
				}
				if(clientfd > maxfd) {
					maxfd = clientfd;
				}
				FD_SET(clientfd, &currfds);
				clients[clientfd].id = globalid++;
				sprintf(sendbuff, "server: client %d just arrived\n", clients[clientfd].id);
				broadcast(clientfd);
				bzero(sendbuff, sizeof(sendbuff));
				break;
			}
			if(FD_ISSET(fd, &readfds) && fd != serverfd) {
				int bufflen = recv(fd, recvbuff, 78000, 0);
				if(bufflen <= 0) {
					sprintf(sendbuff, "server: client %d just left\n", clients[fd].id);
					broadcast(fd);
					FD_CLR(fd, &currfds);
					close(fd);
					break;
				} else {
					for(int i = 0, j = strlen(clients[fd].msg); i < bufflen; i++, j++) {
						clients[fd].msg[j] = recvbuff[i];
						if(clients[fd].msg[j] == '\n') {
							clients[fd].msg[j] = '\0';
							sprintf(sendbuff, "client %d: %s\n", clients[fd].id, clients[fd].msg);
							broadcast(fd);
							bzero(sendbuff, sizeof(sendbuff));
							bzero(clients[fd].msg, strlen(clients[fd].msg));
							j = -1;
						}
					}
					break;
				}
			}
		}
	}
	return (0);
}